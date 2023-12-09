import { Textarea } from "#app/components/ui/textarea.tsx"
import { Button } from "#app/components/ui/button.tsx"

export function PostForm({tag}: {tag: string}) {
  return (
    <div className="bg-primary-foreground rounded-lg p-5 m-2 w-full max-w-3xl">
      <form id="create-post" method="post">
        <input type="hidden" name="tag" value={`${tag}`} />
        <Textarea name="newPostContent" placeholder="What's on your mind?" />
        <Button className='mt-2'>Post</Button>
      </form>
    </div>
  )
}
