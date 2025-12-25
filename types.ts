
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  role: Role;
  text: string;
  files?: Array<{
    name: string;
    type: string;
    data: string; // base64
  }>;
}

export interface AppState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentFiles: FileData[];
}

export interface FileData {
  name: string;
  type: string;
  base64: string;
}
