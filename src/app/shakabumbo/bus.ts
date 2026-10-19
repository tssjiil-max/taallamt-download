// Shakabumbo companion event bus.
// A tiny, dependency-free publish/subscribe channel that links the companion's animation
// engine to real learning events, instead of guessing from UI text.
export type CompanionEventName=
  |'QUESTION_STARTED'
  |'ANSWER_CORRECT'
  |'ANSWER_INCORRECT'
  |'STAR_AWARDED'
  |'TASK_COMPLETED'
  |'QURAN_PLAY_STARTED'
  |'QURAN_PLAY_STOPPED';

type Listener=(detail?:unknown)=>void;

class CompanionBus{
  private listeners=new Map<CompanionEventName,Set<Listener>>();
  emit(name:CompanionEventName,detail?:unknown){
    this.listeners.get(name)?.forEach(listener=>{try{listener(detail)}catch{/* a listener must never break the learning flow */}});
  }
  on(name:CompanionEventName,listener:Listener):()=>void{
    if(!this.listeners.has(name))this.listeners.set(name,new Set());
    this.listeners.get(name)!.add(listener);
    return()=>this.listeners.get(name)?.delete(listener);
  }
}

// One bus for the whole student app: call sites emit real outcomes (a verified star, a
// server-confirmed correct answer, recitation audio actually playing), the companion only
// listens. It never infers a celebration from matching words in a feedback string.
export const companionBus=new CompanionBus();
