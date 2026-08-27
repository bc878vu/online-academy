import { collection, doc, getDocs, query, setDoc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { rewardLearningEvent, unlockAchievement } from './gamificationService';

export const REWARDS={lesson:10,quizPass:25,perfect:50,daily:15,challenge:100,boss:200,course:100};
export async function recordLearningActivity(uid,{type,eventId,xp=0,coins=0,courseId=null,topic=null,score=null,total=null}){
 const r=await rewardLearningEvent(uid,{eventId,xp,coins,type,meta:{courseId,topic,score,total}});
 if(r.awarded){await setDoc(doc(db,'users',uid,'learningAnalytics',eventId),{type,courseId,topic,score,total,createdAt:serverTimestamp()},{merge:true});
 if(type==='lesson') await unlockAchievement(uid,{id:'first_step',icon:'🌱',title:'First Step'});
 if(type==='course') await unlockAchievement(uid,{id:'course_master',icon:'👑',title:'Course Master'});
 if(score!==null&&total&&score===total) await unlockAchievement(uid,{id:'perfect_score',icon:'🎯',title:'Perfect Score'});
 if((r.profile?.streak||0)>=7) await unlockAchievement(uid,{id:'streak_7',icon:'🔥',title:'7 Day Streak'});
 } return r;
}
export async function getWeakAreas(uid){if(!uid)return [];const snap=await getDocs(collection(db,'users',uid,'learningAnalytics'));const by={};snap.forEach(d=>{const x=d.data();if(!x.topic||x.score==null||!x.total)return;if(!by[x.topic])by[x.topic]={topic:x.topic,score:0,total:0};by[x.topic].score+=Number(x.score);by[x.topic].total+=Number(x.total)});return Object.values(by).map(x=>({...x,accuracy:x.total?Math.round(x.score/x.total*100):0})).sort((a,b)=>a.accuracy-b.accuracy)}
