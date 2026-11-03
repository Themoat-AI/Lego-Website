import { Organization, User } from '@/lib/types';

export const currentUser: User = {
  id: 'u-1',
  username: 'brickboss',
  displayName: 'Mia',
  ageGroup: 'Ages 9-12',
  organizationIds: ['org-1', 'org-2']
};

export const users: User[] = [
  currentUser,
  { id: 'u-2', username: 'turbotile', displayName: 'Leo', ageGroup: 'Ages 9-12', organizationIds: ['org-1'] },
  { id: 'u-3', username: 'studiohero', displayName: 'Aria', ageGroup: 'Ages 6-8', organizationIds: ['org-2'] },
  { id: 'u-4', username: 'pixelbuilder', displayName: 'Noah', ageGroup: 'Ages 13+', organizationIds: ['org-1', 'org-2'] },
  { id: 'u-5', username: 'castlecrew', displayName: 'Zoe', ageGroup: 'Ages 9-12', organizationIds: ['org-1'] }
];

export const organizations: Organization[] = [
  {
    id: 'org-1',
    name: 'City Builders Guild',
    focus: 'Modern city designs',
    description: 'A friendly team that creates cool city scenes, transport systems, and tiny details for big LEGO adventures.',
    members: ['u-1', 'u-2', 'u-4', 'u-5'],
    dailySignupCap: 15,
    signups: [
      { date: '2026-11-03', attendees: ['u-1', 'u-2', 'u-4', 'u-5'] },
      { date: '2026-11-04', attendees: ['u-1', 'u-2', 'u-4', 'u-5'] }
    ],
    projects: [
      {
        id: 'p-1',
        title: 'Skyline Tower Challenge',
        status: 'Planning',
        owner: 'Mia',
        dueDate: '2026-11-12',
        neededPieces: ['Blue tiles', 'White windows', 'Yellow lights', 'Glass bricks'],
        updates: ['Need a tall tower base.', 'Looking for a rooftop observation deck.']
      },
      {
        id: 'p-2',
        title: 'Mini Train Station',
        status: 'Building',
        owner: 'Leo',
        dueDate: '2026-11-09',
        neededPieces: ['Dark gray rails', 'Train wheels', 'Signage tiles'],
        updates: ['Track layout is almost complete.', 'Final station roof is being planned.']
      }
    ],
    chat: [
      {
        id: 'c-1',
        title: 'City Builders General',
        messages: [
          { id: 'm-1', sender: 'Mia', text: 'Anyone want to build a market plaza this week?', timestamp: '9:00 AM' },
          { id: 'm-2', sender: 'Leo', text: 'Yes! I can bring some road plates and signs.', timestamp: '9:04 AM' }
        ]
      }
    ]
  },
  {
    id: 'org-2',
    name: 'BrickQuest Alliance',
    focus: 'Story scenes and adventures',
    description: 'A team of creative kids who create story-based scenes, castles, and magical worlds to adventure through.',
    members: ['u-1', 'u-3', 'u-4'],
    dailySignupCap: 15,
    signups: [
      { date: '2026-11-03', attendees: ['u-1', 'u-3', 'u-4'] },
      { date: '2026-11-04', attendees: ['u-1', 'u-3'] }
    ],
    projects: [
      {
        id: 'p-3',
        title: 'Forest Mystery Cave',
        status: 'Ready to Share',
        owner: 'Aria',
        dueDate: '2026-11-08',
        neededPieces: ['Green leaves', 'Brown tree trunks', 'Glow bricks'],
        updates: ['Mystery door is done.', 'Treasure chest is ready for display.']
      }
    ],
    chat: [
      {
        id: 'c-2',
        title: 'Story Scene Chat',
        messages: [
          { id: 'm-3', sender: 'Aria', text: 'I have a dragon cave idea. Want to help?', timestamp: '7:35 AM' },
          { id: 'm-4', sender: 'Noah', text: 'Absolutely! I can build the cave entrance.', timestamp: '7:40 AM' }
        ]
      }
    ]
  }
];
