import type { Message } from "ai/react";
import {Bot} from 'lucide-react'
import {User} from 'lucide-react'

//export function ChatMessageBubble(props: { message: Message, aiEmoji?: string, sources: any[] }) {
export function ChatMessageBubble(props: { message: Message, aiEmoji?: React.JSX.Element, sources: any[] }) {
  const colorClassName =
    props.message.role === "user" ? "bg-slate-500 text-white text-normal font-semibold" : "bg-slate-400 text-white text-normal font-semibold";
  const alignmentClassName =
    props.message.role === "user" ? "ml-auto" : "mr-auto";
  const prefix = props.message.role === "user" ? <User className="flex text-blue-600"/> : props.aiEmoji;
  //const prefix = props.message.role === "user" ? "🧑" : props.aiEmoji;
  
  return (
    <div className="mr-22" id="inline">
    {props.message.role === "user" ?<div className="one">{prefix} </div>:""}
      <div 
      className={`${alignmentClassName} ${colorClassName} rounded px-4 py-3 max-w-[80%] mb-8 flex two`}>
        <span>{props.message.content}</span>
        {props.sources && props.sources.length ? <>
          <code className="mt-4 mr-auto bg-slate-600 px-2 py-1 rounded">
            <h2>
              🔍 Sources:
            </h2>
          </code>
          <code className="mt-0 mr-2 bg-slate-600 px-2 py-1 rounded text-xs">
            {props.sources?.map((source, i) => (
              <div className="mt-2" key={"source:" + i}>
                {i + 1}. &quot;{source.pageContent}&quot;{
                  source.metadata?.loc?.lines !== undefined
                    ? <div>
                      <br/>Lines {source.metadata?.loc?.lines?.from} to {source.metadata?.loc?.lines?.to}</div>
                    : ""
                  }
              </div>
            ))}
          </code>
        </> : ""}
      </div>
      {props.message.role !== "user" ?<div className="tree">{prefix} </div>:""}
    </div>
  );
}