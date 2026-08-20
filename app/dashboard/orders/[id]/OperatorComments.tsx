import { addOperatorCommentAction } from "@/lib/actions/operator";
import { formatDateTime } from "@/lib/stats";

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

export function OperatorComments({
  target,
  comments,
}: {
  groupOrderId: string;
  target: CommentTarget;
  comments: CommentItem[];
}) {
  const addAction = addOperatorCommentAction.bind(null, target);

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      {comments.length > 0 && (
        <ul className="space-y-1">
          {comments.map((c) => (
            <li key={c.id} className="text-sm text-slate-700">
              {c.text}{" "}
              <span className="text-xs text-slate-400">
                ({c.author ? `${c.author}, ` : ""}
                {formatDateTime(c.createdAt)})
              </span>
            </li>
          ))}
        </ul>
      )}
      <form action={addAction} className="flex gap-2">
        <input
          className="field-input flex-1"
          type="text"
          name="text"
          placeholder="Add a comment..."
          required
        />
        <button type="submit" className="btn-secondary shrink-0">
          Add
        </button>
      </form>
    </div>
  );
}
