import { addCommentAction, deleteCommentAction } from "@/lib/actions/comments";
import { formatDateTime } from "@/lib/stats";
import { ConfirmSubmitButton } from "./ConfirmSubmitButton";

type CommentTarget =
  | { level: "group"; groupOrderId: string }
  | { level: "sub"; groupOrderId: string; subOrderId: string }
  | { level: "truck"; groupOrderId: string; subOrderId: string; truckId: string };

type CommentItem = {
  id: string;
  text: string;
  author: string | null;
  createdAt: Date;
};

export function CommentsSection({
  target,
  comments,
}: {
  target: CommentTarget;
  comments: CommentItem[];
}) {
  const addAction = addCommentAction.bind(null, target);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Comments</h3>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const deleteAction = deleteCommentAction.bind(null, target, comment.id);
            return (
              <li
                key={comment.id}
                className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-800 whitespace-pre-wrap">{comment.text}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {comment.author ? `${comment.author} · ` : ""}
                      {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                  <form action={deleteAction}>
                    <ConfirmSubmitButton
                      confirmText="Delete this comment?"
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label">Add comment</label>
          <input
            className="field-input"
            type="text"
            name="text"
            placeholder="Write a comment..."
            required
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="field-label">Your name (optional)</label>
          <input className="field-input" type="text" name="author" placeholder="Name" />
        </div>
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>
    </div>
  );
}
