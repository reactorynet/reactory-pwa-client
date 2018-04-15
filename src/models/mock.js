import uuid from 'uuid';
import moment from 'moment';
import staffImages from '../assets/images/staff';



export const users = [
    {
        id: uuid(),
        firstName: 'Werner',
        lastName: 'Weber',
        businessUnit: 'Development',
        email: 'werner.weber@gmail.com',
        avatar: staffImages.WernerW    
    },
    {
        id: uuid(),
        firstName: 'Mandy',
        lastName: 'Eagar',
        businessUnit: 'Executive',
        email: 'mandy.eagar@towerstone-global.com',    
        avatar: staffImages.MandyE
    },
    {
        id: uuid(),
        firstName: 'Thea',
        lastName: 'Nel',
        businessUnit: 'Leadership',
        email: 'thea.nel@towerstone-global.com',    
        avatar: staffImages.TheaN
    }
]

export const loggedInUser = users[0];

export const loggedInUserSurveys = {
    overdue: [
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2018', assessmentType: '360' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 73, complete: true, assessors: 18, completed: '21 Oct 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 71, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 68, complete: true, assessors: 18, completed: '21 April 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 67, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },        
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2017', assessmentType: '360' },
    ],
    current: [
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2018', assessmentType: '360' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 73, complete: true, assessors: 18, completed: '21 Oct 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 71, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 68, complete: true, assessors: 18, completed: '21 April 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 67, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },        
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2017', assessmentType: '360' },
    ],
    complete: [
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2018', assessmentType: '360' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 73, complete: true, assessors: 18, completed: '21 Oct 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 71, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 68, complete: true, assessors: 18, completed: '21 April 2017', assessmentType: 'team' },
        { id: uuid(), title: 'Quarterly Team Assessment', overall: 67, complete: true, assessors: 18, completed: '21 July 2017', assessmentType: 'team' },        
        { id: uuid(), title: 'Annual External Vendor Assessment', overall: 75, complete: true, assessors: 4, completed: '16 Jan 2017', assessmentType: '360' },
    ]
};

export const loggedInUserActiveChats = [
    { id: uuid(), recipientId: uuid(), title: 'Sparky', subtitle: 'WooSparks assistant - available', messages: [
        { id: uuid(), message: 'Hi Werner, how are you today?', received: 'now' }
    ], group: false, bot: true, avatar: staffImages.Anon },
    { id: uuid(), recipientId: uuid(), title: 'Martin', subtitle: 'Chief Idealist', messages: [], group: false, bot: false,  avatar: staffImages.MartinB },
    { id: uuid(), recipientId: uuid(), title: 'Nicole', subtitle: 'Social Engineer', messages: [], group: false, bot: false,  avatar: staffImages.NicoleVO },
    { id: uuid(), recipientId: uuid(), title: 'Andrew', subtitle: 'Contributor', messages: [], group: false, bot: false,  avatar: staffImages.AndrewS },
    { id: uuid(), recipientId: uuid(), title: 'Designers', subtitle: 'You, Nicole, Martin +3 more', messages: [], group: true, bot: false,  avatar: staffImages.Anon },
    { id: uuid(), recipientId: uuid(), title: 'Developers', subtitle: 'You, Jason, Henry +5 more', messages: [], group: true, bot: false,  avatar: staffImages.Anon },
];

export const comments = [
    { id: uuid(), who: users[0], text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', when: moment().subtract(1,'d') },
    { id: uuid(), who: users[1], text: 'In hac habitasse platea dictumst. Integer laoreet, ex suscipit cursus euismod, augue nisi feugiat libero, non faucibus arcu urna nec lorem', when: moment().subtract(2,'d') },
    { id: uuid(), who: users[2], text: ' Sed varius congue dui ut consequat. Sed nec ante elit. Etiam consequat congue nibh ut pretium.', when: moment().subtract(3,'d') }
]