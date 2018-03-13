import uuid from 'uuid';

export const loggedInUser = {
    id: uuid(),
    firstName: 'Werner',
    lastName: 'Weber',
    businessUnit: 'Development',
    email: 'werner.weber@gmail.com'
};

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