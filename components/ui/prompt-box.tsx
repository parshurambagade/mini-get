import { Button } from '@/components/ui/button'
import { IMessage } from '@/types'
import Error from 'next/error';

interface IPromptBox {
    query: string,
    setQuery: React.Dispatch<React.SetStateAction<string>>,
    handleSend: () => void
}
const PromptBox = ({ query, setQuery, handleSend }: IPromptBox) => {
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