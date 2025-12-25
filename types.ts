
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

export interface ChatSession {
  id: string;
  title: string;
  date: number; // timestamp
  messages: ChatMessage[];
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

export interface SchoolConfig {
  schoolName: string;
  principalName: string;
  principalNip: string;
  schoolYear: string;
  username: string; // New field
  password: string; // New field
}
