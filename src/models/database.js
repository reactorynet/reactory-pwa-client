/*
import Dexie from 'dexie';


export const tasksDb = new Dexie('tasksDb');
tasksDb.version(1).stores(
    {
        tasks: '++id,title,description,provider',
        projects: '++id,title,selected'        
    }
);

export const userDb = new Dexie('userDb');
userDb.version(1).stores(
    {
        users: '++id,firstName,lastName,email,avatar,me',
        organizations: '++id,title,provider'
    }
);

const db = { 
    tasksDb,
    userDb
};

export default db;
*/