import React from 'react'
interface IMessage {
    role: string
    content: string
}
const Message = ({ role, content }: IMessage) => {
    return (
        <div className={`py-3 px-2 rounded-xl max-w-fit my-2 ${role === "user" ? "ml-auto bg-neutral-800" : "mr-auto bg-transparent"}`}>
            <p>{content}</p>
        </div>
    )
}

export default Message