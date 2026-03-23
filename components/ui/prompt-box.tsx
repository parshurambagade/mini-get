import { Button } from '@/components/ui/button'
import { IMessage } from '@/types'
import Error from 'next/error';

interface IPromptBox {
    setMessages: React.Dispatch<React.SetStateAction<IMessage[]>>,
    query: string,
    setQuery: React.Dispatch<React.SetStateAction<string>>,
}
const PromptBox = ({ setMessages, query, setQuery }: IPromptBox) => {
    const handleSend = async () => {
        if (query.trim() === "") return;
        setMessages((prev) => [...prev, { role: "user", content: query }])
        setQuery("")

        const response = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({ query }),
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            let errorMsg = "Error generating response, please try again later!";

            try {
                const err = await response.json();
                errorMsg = err.error || errorMsg;
            } catch {

            }

            setMessages(prev => [...prev, {
                role: "assistant",
                content: errorMsg

            }])
        }

        const data = await response.json();

        const msg = {
            role: "assistant",
            content: data.message
        }

        setMessages(prev => [...prev, msg]);

    }

    return (
        <div className="bg-neutral-800 w-full max-w-3xl p-2 overflow-hidden rounded-xl ">
            <textarea className="w-full resize-none py-2 px-3 outline-none" rows={2} value={query} onChange={(e) => setQuery(e.target.value)} onKeyUp={(e) => e.key === "Enter" && handleSend()}></textarea>
            <div className="flex justify-end p-1">
                <Button variant="outline" className="bg-white hover:bg-gray-200 text-black cursor-pointer" onClick={handleSend}>Send</Button>
            </div>
        </div>
    )
}

export default PromptBox