"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { formatDateTime, type CommentDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "./ConfirmButton";

type CommentTarget = { groupOrderId: string; subOrderId: string };

export function CommentsSection({
  target,
  comments,
}: {
  target: CommentTarget;
  comments: CommentDto[];
}) {
  const { submit, submitForm, pending, error } = useApiSubmit();

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <MessageSquare className="h-4 w-4" />
        Comments
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="whitespace-pre-wrap text-slate-800">{comment.text}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {comment.author ? `${comment.author} · ` : ""}
                    {formatDateTime(comment.createdAt)}
                  </p>
                </div>
                <ConfirmButton
                  confirmText="Delete this comment?"
                  className="text-xs text-red-500 hover:text-red-700"
                  disabled={pending}
                  onConfirm={() => submit(`/api/admin/comments/${comment.id}`, { method: "DELETE" })}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => submitForm(e, "/api/admin/comments")} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="level" value="sub" />
        <input type="hidden" name="groupOrderId" value={target.groupOrderId} />
        <input type="hidden" name="subOrderId" value={target.subOrderId} />
        <div className="flex-1">
          <label className="field-label">Add comment</label>
          <input className="field-input" type="text" name="text" placeholder="Write a comment..." required />
        </div>
        <div className="w-full sm:w-40">
          <label className="field-label">Your name (optional)</label>
          <input className="field-input" type="text" name="author" placeholder="Name" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
