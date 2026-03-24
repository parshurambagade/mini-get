
const Message = ({ role, content, className }: { role: string, content: string, className?: string }) => {
    return (
        <div className={`py-3 px-2 rounded-xl max-w-fit my-2 ${role === "user" ? "ml-auto bg-neutral-800" : "mr-auto bg-transparent"} ${className}`}>
            <p>{content}</p>
        </div>
    )
}

export default Message