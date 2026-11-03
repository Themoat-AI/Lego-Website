export type User = {
  id: string;
  username: string;
  displayName: string;
  ageGroup: 'Ages 6-8' | 'Ages 9-12' | 'Ages 13+';
  organizationIds: string[];
};

export type DailySignup = {
  date: string;
  attendees: string[];
};

export type Project = {
  id: string;
  title: string;
  status: 'Planning' | 'Building' | 'Ready to Share';
  owner: string;
  dueDate: string;
  neededPieces: string[];
  updates: string[];
};

export type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export type Organization = {
  id: string;
  name: string;
  focus: string;
  description: string;
  members: string[];
  dailySignupCap: number;
  signups: DailySignup[];
  projects: Project[];
  chat: ChatThread[];
};
