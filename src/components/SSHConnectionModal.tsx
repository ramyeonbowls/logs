import React from 'react';
import { SSHConnection } from '../types/ssh';
import { ConnectionSettingsModal } from './ConnectionSettingsModal';

interface SSHConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: SSHConnection[];
  activeConnectionId: string;
  onSaveConnection: (connection: SSHConnection) => void;
  onSelectConnection: (connectionId: string, updatedTree?: any[]) => void;
  onRefreshConnections?: () => Promise<void>;
}

export const SSHConnectionModal: React.FC<SSHConnectionModalProps> = ({
  isOpen,
  onClose,
  connections,
  activeConnectionId,
  onSaveConnection,
  onSelectConnection,
  onRefreshConnections = async () => {}
}) => {
  return (
    <ConnectionSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      connections={connections}
      activeConnectionId={activeConnectionId}
      onSelectConnection={onSelectConnection}
      onRefreshConnections={onRefreshConnections}
    />
  );
};
