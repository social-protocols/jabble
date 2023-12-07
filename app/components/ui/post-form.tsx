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


  // (
  //   <form id="reply-form" method="post">
  //     <div className="w-full flex">
  //       <input type="hidden" name="parentId" value={parentId} />
  //       <input type="hidden" name="tag" value={tag} />

  //       <div className="mr-1">
  //         <textarea name="content"
  //           className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
  //           cols={100}
  //           rows={1}
  //           placeholder="Enter your reply">
  //         </textarea>
  //       </div>
  //       <div className="justify-end">
  //         <button className="bg-blue-500 hover:bg-blue-700 text-base text-white font-bold py-2 px-4 rounded float-right">
  //           Reply
  //         </button>
  //       </div>
  //     </div>
  //   </form >
  // )
