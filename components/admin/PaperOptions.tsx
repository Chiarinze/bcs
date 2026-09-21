"use client";

import { TextInput, TextArea } from "@/components/ui/FormInputs";
import type { Event } from "@/types";

const DEFAULT_EMAIL = "academicforum@beninchoraleandphilharmonic.com";
const DEFAULT_DEADLINE = "2026-11-30";
const DEFAULT_SIGNATURE =
  "Chidera Arinze\nDirector of ICT, Training and Research\nBenin Chorale and Philharmonic, Nigeria";

/**
 * "Collect paper presentation details" option for public events. When on,
 * the registration/ticket form asks for institutional affiliation, whether
 * the person is presenting a paper, and the paper title; presenters get a
 * confirmation email with these submission details.
 */
export default function PaperOptions({
  enabled,
  onToggle,
  event,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  event?: Pick<Event, "paper_submission_email" | "paper_deadline" | "paper_signature">;
}) {
  return (
    <div className="pt-2 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded text-bcs-green"
        />
        <span className="text-gray-700">Collect paper presentation details</span>
      </label>
      {enabled && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs text-gray-500">
            The form will ask for institutional affiliation, whether they are presenting a paper, and the paper
            title. Presenters receive these details in their confirmation email.
          </p>
          <TextInput
            type="email"
            name="paper_submission_email"
            label="Abstract submission email"
            defaultValue={event?.paper_submission_email || DEFAULT_EMAIL}
            required
          />
          <TextInput
            type="date"
            name="paper_deadline"
            label="Submission deadline"
            defaultValue={event?.paper_deadline || DEFAULT_DEADLINE}
            required
          />
          <TextArea
            name="paper_signature"
            label="Email signature (presenter email)"
            rows={3}
            defaultValue={event?.paper_signature || DEFAULT_SIGNATURE}
          />
        </div>
      )}
    </div>
  );
}
