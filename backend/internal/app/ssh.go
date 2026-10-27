package app

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func sshFiles(c connection) (string, string, func(), []string, []string, error) {
	tmpDir, err := os.MkdirTemp("", "logpulse-ssh-*")
	if err != nil {
		return "", "", nil, nil, nil, err
	}
	cleanup := func() { _ = os.RemoveAll(tmpDir) }
	knownHosts := filepath.Join(defaultString(os.Getenv("DATA_DIR"), "./data"), "known_hosts")
	if err := os.MkdirAll(filepath.Dir(knownHosts), 0o700); err != nil {
		cleanup()
		return "", "", nil, nil, nil, err
	}
	if err := os.Chmod(filepath.Dir(knownHosts), 0o700); err != nil {
		cleanup()
		return "", "", nil, nil, nil, err
	}
	base := []string{"-p", fmt.Sprint(defaultInt(c.Port, 22)), "-oConnectTimeout=10", "-oServerAliveInterval=15", "-oServerAliveCountMax=2",
		"-oStrictHostKeyChecking=accept-new", "-oUserKnownHostsFile=" + knownHosts, "-oGlobalKnownHostsFile=/dev/null",
		"-oBatchMode=no"}
	env := []string{}
	if c.AuthMethod == "key" {
		if strings.TrimSpace(c.PrivateKey) == "" {
			cleanup()
			return "", "", nil, nil, nil, errors.New("SSH private key is required")
		}
		keyPath := filepath.Join(tmpDir, "id_key")
		if err := os.WriteFile(keyPath, []byte(c.PrivateKey), 0o600); err != nil {
			cleanup()
			return "", "", nil, nil, nil, err
		}
		base = append(base, "-i", keyPath, "-oIdentitiesOnly=yes")
		if c.Passphrase != "" {
			helper := filepath.Join(tmpDir, "askpass")
			if err := os.WriteFile(helper, []byte("#!/bin/sh\nprintf '%s\\n' \"$LOGPULSE_SSH_PASSWORD\"\n"), 0o700); err != nil {
				cleanup()
				return "", "", nil, nil, nil, err
			}
			env = append(env, "SSH_ASKPASS="+helper, "SSH_ASKPASS_REQUIRE=force", "DISPLAY=logpulse:0", "LOGPULSE_SSH_PASSWORD="+c.Passphrase)
		}
	} else if c.AuthMethod == "password" {
		if c.Password == "" {
			cleanup()
			return "", "", nil, nil, nil, errors.New("SSH password is required")
		}
		helper := filepath.Join(tmpDir, "askpass")
		if err := os.WriteFile(helper, []byte("#!/bin/sh\nprintf '%s\\n' \"$LOGPULSE_SSH_PASSWORD\"\n"), 0o700); err != nil {
			cleanup()
			return "", "", nil, nil, nil, err
		}
		env = append(env, "SSH_ASKPASS="+helper, "SSH_ASKPASS_REQUIRE=force", "DISPLAY=logpulse:0", "LOGPULSE_SSH_PASSWORD="+c.Password)
		base = append(base, "-oPreferredAuthentications=password,keyboard-interactive", "-oNumberOfPasswordPrompts=1")
	} else {
		cleanup()
		return "", "", nil, nil, nil, errors.New("unsupported SSH authentication method")
	}
	destination := c.Username + "@" + c.Host
	return tmpDir, knownHosts, cleanup, base, append(env, "LOGPULSE_SSH_DEST="+destination), nil
}

func (a *App) runSSH(ctx context.Context, c connection, remoteCommand string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	_, _, cleanup, options, env, err := sshFiles(c)
	if err != nil {
		return nil, err
	}
	defer cleanup()
	destination := ""
	for _, item := range env {
		if strings.HasPrefix(item, "LOGPULSE_SSH_DEST=") {
			destination = strings.TrimPrefix(item, "LOGPULSE_SSH_DEST=")
		}
	}
	filteredEnv := make([]string, 0, len(env))
	for _, item := range env {
		if !strings.HasPrefix(item, "LOGPULSE_SSH_DEST=") {
			filteredEnv = append(filteredEnv, item)
		}
	}
	args := append(options, destination, remoteCommand)
	cmd := exec.CommandContext(ctx, "ssh", args...)
	cmd.Env = append(os.Environ(), filteredEnv...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	var stdout, stderr limitedBuffer
	stdout.limit, stderr.limit = 2<<20, 64<<10
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = "SSH command failed"
		}
		return stdout.Bytes(), fmt.Errorf("%s", message)
	}
	return stdout.Bytes(), nil
}

func (a *App) runSFTP(ctx context.Context, c connection, batch string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	_, _, cleanup, sshOptions, env, err := sshFiles(c)
	if err != nil {
		return nil, err
	}
	defer cleanup()
	destination := ""
	filteredEnv := make([]string, 0, len(env))
	for _, item := range env {
		if strings.HasPrefix(item, "LOGPULSE_SSH_DEST=") {
			destination = strings.TrimPrefix(item, "LOGPULSE_SSH_DEST=")
		} else {
			filteredEnv = append(filteredEnv, item)
		}
	}
	// Keep SFTP in stdin-driven interactive mode so SSH_ASKPASS can supply a
	// password or private-key passphrase. SFTP's -b flag forces BatchMode=yes.
	options := []string{"-P", fmt.Sprint(defaultInt(c.Port, 22))}
	for i := 0; i < len(sshOptions); i++ {
		option := sshOptions[i]
		if option == "-p" {
			i++ // The OpenSSH port is already provided with sftp's -P option.
			continue
		}
		if strings.HasPrefix(option, "-o") {
			options = append(options, option)
		} else if option == "-i" && i+1 < len(sshOptions) {
			options = append(options, "-i", sshOptions[i+1])
			i++
		}
	}
	cmd := exec.CommandContext(ctx, "sftp", append(options, destination)...)
	cmd.Env = append(os.Environ(), filteredEnv...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	cmd.Stdin = strings.NewReader(batch + "\n")
	var stdout, stderr limitedBuffer
	stdout.limit, stderr.limit = 1<<20, 64<<10
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = strings.TrimSpace(stdout.String())
		}
		if message == "" {
			message = "SFTP command failed"
		}
		return stdout.Bytes(), fmt.Errorf("%s", message)
	}
	return stdout.Bytes(), nil
}

type limitedBuffer struct {
	bytes.Buffer
	limit int
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	n := len(p)
	remaining := b.limit - b.Len()
	if remaining > 0 {
		if len(p) > remaining {
			p = p[:remaining]
		}
		_, _ = b.Buffer.Write(p)
	}
	return n, nil
}

func (b *limitedBuffer) Bytes() []byte  { return b.Buffer.Bytes() }
func (b *limitedBuffer) String() string { return b.Buffer.String() }

func copyCommandOutput(ctx context.Context, w io.Writer, c connection, remoteCommand string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()
	_, _, cleanup, options, env, err := sshFiles(c)
	if err != nil {
		return err
	}
	defer cleanup()
	destination := ""
	filteredEnv := make([]string, 0, len(env))
	for _, item := range env {
		if strings.HasPrefix(item, "LOGPULSE_SSH_DEST=") {
			destination = strings.TrimPrefix(item, "LOGPULSE_SSH_DEST=")
		} else {
			filteredEnv = append(filteredEnv, item)
		}
	}
	cmd := exec.CommandContext(ctx, "ssh", append(options, destination, remoteCommand)...)
	cmd.Env = append(os.Environ(), filteredEnv...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	cmd.Stderr = io.Discard
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	_, copyErr := io.Copy(w, stdout)
	waitErr := cmd.Wait()
	if copyErr != nil {
		return copyErr
	}
	return waitErr
}

func shellQuote(value string) string { return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'" }
