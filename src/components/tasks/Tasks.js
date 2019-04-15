import Trello from 'trello';
import co from 'co';
import { nilStr, nil } from '../util';
import db from '../../models/database';

/**
 * default apiKey = process.env.TRELLO_API_KEY
 * default userToken = process.env.TRELLO_API_USER_TOKEN
 */

export class TrelloProvider {

    constructor(){
        this.apiKey = process.env.TRELLO_API_KEY;
        this.userToken = process.env.TRELLO_API_USER_TOKEN;
        this.createTrelloInstance();  
    }

    get apiKey() {
        return localStorage.getItem('trello_apiKey');
    }

    set apiKey(value) {
        localStorage.setItem('trello_apiKey', value);
    }

    get userToken() {
        return localStorage.getItem('trello_userToken');
    }

    set userToken(value) {
        localStorage.setItem('trello_userToken', value);
    }

    createTrelloInstance(){            
        const init = () => this.trello = new Trello(this.apiKey, this.userToken); 
        if(nilStr(this.apiKey) === false && nilStr(this.userToken) === false) {
            init();
        }
        
        window.addEventListener('storage', (evt)=>{
            if(evt.key === 'trello_apiKey' || evt.key === 'trello_userToken'){
                init();
            }
        });
    }

    loadBoardData(boardId){
        const boardData = {
            members: [],
            cards: []
        };

        const that = this;
        return co(function*(){
            boardData.members = yield that.trello.getBoardMembers(boardId);
            
            const _members = [...boardData.members];
            for(let idx=0;idx<boardData.members.length;idx++){
                _members[idx] = yield that.getMemberData(boardData.members[idx].id);
            }                                    
            boardData.members = [..._members];

            boardData.cards = yield that.trello.getCardsOnBoard(boardId);
            boardData.cards.map((card) => {
                card.woosparks_quadrant = 'hvhp';
            });
            
            return boardData;                                                 
        });
    }

    listTeams(){
        return new Promise((resolve, reject) => {
            this.trello.getOrganization('me').then((memberResult) => {

                resolve(memberResult);
            });
        });
    }

    getMemberData(memberId = 'me'){
        return new Promise((resolve, reject) =>{
            this.trello.getMember(memberId).then((memberResult)=>{
                resolve(memberResult);
            });
        });
    }

    listProjects(orgId = null){                
        return new Promise((resolve, reject) => {
            if(orgId === null){
                this.trello.getBoards('me').then((boards)=>{
                    //console.log('retrieve boards from trello', boards);
                    resolve(boards);
                });
            }else{
                this.trello.getOrgBoards(orgId).then((boards)=>{
                    resolve(boards);
                });
            }
            
        });        
    }
}

export class TaskService {
    
    listProjects(){
        return db.tasksDb.tasks.toArray();
    }

    listOrganizations(){
        return db.userDb.organizations.toArray();
    }

}

const TaskServiceInstance = new TaskService();
export default TaskServiceInstance;