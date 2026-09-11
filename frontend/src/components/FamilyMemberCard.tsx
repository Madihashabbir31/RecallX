import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Volume2,
  Info,
  Calendar,
  Pencil,
  Trash2,
  Heart,
  UserCheck,
} from "lucide-react";
import { RecallCard, SecondaryButton, PrimaryButton, Modal } from "./ui";
import { Photo } from "../context";
import { speak } from "../services/voice";

// Maps relationship / name to bundled local avatar assets
export function getLocalAvatarPath(relation = "", name = ""): string {
  const rel = relation.toLowerCase();
  const n = name.toLowerCase();

  if (rel.includes("daughter") || n.includes("priya") || n.includes("anita")) {
    return "/avatars/daughter.svg";
  }
  if (rel.includes("son") || n.includes("rahul") || n.includes("rajesh")) {
    return "/avatars/son.svg";
  }
  if (rel.includes("wife") || rel.includes("spouse") || n.includes("sunita") || n.includes("asha")) {
    return "/avatars/wife.svg";
  }
  if (rel.includes("granddaughter") || n.includes("anaya")) {
    return "/avatars/granddaughter.svg";
  }
  if (rel.includes("grandson") || n.includes("aarav")) {
    return "/avatars/grandson.svg";
  }
  if (rel.includes("brother") || n.includes("vikram") || n.includes("amit")) {
    return "/avatars/brother.svg";
  }
  if (rel.includes("sister") || n.includes("meera")) {
    return "/avatars/sister.svg";
  }
  return "";
}

export function FamilyMemberCard({
  person,
  isCaregiver = false,
  onEdit,
  onDelete,
  onUpload,
  busy = false,
}: {
  person: any;
  isCaregiver?: boolean;
  onEdit?: (p: any) => void;
  onDelete?: (p: any) => void;
  onUpload?: (p: any, file?: File) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected">("idle");
  const [imageError, setImageError] = useState(false);

  const localAvatar = getLocalAvatarPath(person.relation, person.name);
  const phone = person.phone || "+91 98765 43210";
  const lastContact = person.last_interaction || "Visited yesterday at 5:00 PM";
  const reminderStatus = person.reminder_status || "Scheduled call today at 6:00 PM";

  const handleStartCall = () => {
    setCallState("ringing");
    setTimeout(() => {
      setCallState("connected");
      speak(`Calling ${person.name}.`);
    }, 1500);
  };

  const handleEndCall = () => {
    setCallState("idle");
    window.speechSynthesis?.cancel();
  };

  const handleSpeakDetails = () => {
    speak(`${person.name}. ${person.relation}. ${person.memory_note}.`);
  };

  return (
    <>
      <RecallCard className="family-card enhanced-family-card">
        <div className="family-card-photo-wrapper">
          {person.photo && !imageError ? (
            <Photo
              person={person}
              className="family-avatar-img"
            />
          ) : localAvatar && !imageError ? (
            <img
              src={localAvatar}
              alt={person.name}
              className="family-avatar-img"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="avatar family-avatar-fallback">
              {person.name.charAt(0)}
            </div>
          )}
          <span className="badge family-relation-badge">{t(person.relation.toLowerCase()) || person.relation}</span>
        </div>

        <div className="family-card-content">
          <h2 className="family-card-name">{person.name}</h2>
          <p className="family-card-note">{person.memory_note}</p>

          <div className="family-card-meta">
            <div className="family-meta-row">
              <Phone size={14} className="text-teal" />
              <span>{phone}</span>
            </div>
            <div className="family-meta-row">
              <Calendar size={14} className="text-muted" />
              <span>{lastContact}</span>
            </div>
          </div>
        </div>

        <div className="family-card-actions">
          <button
            type="button"
            className="button primary family-quick-call-btn"
            onClick={handleStartCall}
          >
            <PhoneCall size={16} />
            {t("quickCall")}
          </button>
          <button
            type="button"
            className="button secondary family-details-btn"
            onClick={() => setDetailsOpen(true)}
          >
            <Info size={16} />
            {t("viewDetails")}
          </button>
        </div>

        {isCaregiver && (
          <div className="caregiver-card-controls">
            <label className="upload-label compact-upload">
              {busy ? "Uploading…" : t("uploadPhoto")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => onUpload?.(person, e.target.files?.[0])}
              />
            </label>
            <div className="button-row justify-center">
              <button
                type="button"
                className="text-link"
                onClick={() => onEdit?.(person)}
              >
                <Pencil size={15} />
                Edit
              </button>
              <button
                type="button"
                className="text-link danger"
                onClick={() => onDelete?.(person)}
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
        )}
      </RecallCard>

      {/* Quick Call Simulation Modal */}
      {callState !== "idle" && (
        <Modal
          title={callState === "ringing" ? t("calling") : t("callConnected")}
          onClose={handleEndCall}
        >
          <div className="call-modal-body">
            <div className="call-avatar-pulse">
              {localAvatar ? (
                <img src={localAvatar} alt={person.name} className="call-modal-avatar" />
              ) : (
                <div className="avatar call-modal-avatar">{person.name[0]}</div>
              )}
            </div>
            <h2>{person.name}</h2>
            <span className="badge">{person.relation}</span>
            <p className="call-phone-text">{phone}</p>
            <p className="call-status-message">
              {callState === "ringing"
                ? "Connecting to family circle…"
                : t("callConnected")}
            </p>
            <div className="call-controls-row">
              <PrimaryButton onClick={handleEndCall} className="btn-danger-call">
                <PhoneOff size={18} />
                {t("endCall")}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Details Modal */}
      {detailsOpen && (
        <Modal title={person.name} onClose={() => setDetailsOpen(false)}>
          <div className="details-modal-body">
            <div className="details-modal-header">
              {localAvatar ? (
                <img src={localAvatar} alt={person.name} className="details-modal-avatar" />
              ) : (
                <div className="avatar details-modal-avatar">{person.name[0]}</div>
              )}
              <div>
                <h2>{person.name}</h2>
                <span className="badge">{person.relation}</span>
                <p className="details-contact-info">{phone}</p>
              </div>
            </div>

            <div className="details-section">
              <h4>
                <Heart size={16} className="text-coral" />
                {t("memoryNotes")}
              </h4>
              <p>{person.memory_note}</p>
            </div>

            {person.important_facts && (
              <div className="details-section">
                <h4>
                  <Info size={16} className="text-teal" />
                  {t("importantFacts")}
                </h4>
                <p>{person.important_facts}</p>
              </div>
            )}

            <div className="details-section">
              <h4>
                <Calendar size={16} className="text-muted" />
                {t("lastInteraction")}
              </h4>
              <p>{lastContact}</p>
            </div>

            <div className="button-row space-top">
              <SecondaryButton onClick={handleSpeakDetails}>
                <Volume2 size={18} />
                {t("hear")}
              </SecondaryButton>
              <PrimaryButton onClick={handleStartCall}>
                <PhoneCall size={18} />
                {t("quickCall")}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
