import { Textarea } from "#app/components/ui/textarea.tsx"
import { Button } from "#app/components/ui/button.tsx"

export function PostForm() {
  return (
    <div>
      <form id="create-post" method="post">
        <div>
          <input type="hidden" name="tag" value="global" />
          <div>
            <Textarea name="newPostContent" placeholder="What's on your mind?" />
          </div>
          <div>
            <Button>Post</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
