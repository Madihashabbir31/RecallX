import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context";
export function WebTools() {
  const { user, data } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool || !user || !data) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_recallx_day",
        description:
          "Read the signed-in user’s linked patient routine and activity summary.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({
          patient: data.patient.name,
          date: data.date,
          routines: data.routines.map((r: any) => ({
            title: r.title,
            time: r.scheduled_time,
            status: r.status,
          })),
          memory_score: data.progress.memory_score,
        }),
      },
      {
        name: "start_recallx_game",
        description:
          "Navigate to a cognitive game. Does not complete or save a game.",
        inputSchema: {
          type: "object",
          properties: {
            game: {
              type: "string",
              enum: ["memory", "object", "sequence", "family"],
            },
          },
          required: ["game"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: any) => {
          if (
            user.role !== "patient" ||
            !["memory", "object", "sequence", "family"].includes(input?.game)
          )
            throw new Error("Choose a supported game from a patient account.");
          navigate("/patient/games/" + input.game);
          return { started: true, game: input.game };
        },
      },
    ];
    for (const tool of tools)
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    return () => lifecycle.abort();
  }, [user?.id, data, navigate]);
  return null;
}
