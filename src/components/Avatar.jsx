import PoliticianAvatar from "./PoliticianAvatars";

export default function Avatar({ name, politicianId, size = 40, className = "" }) {
  return (
    <div className={`flex-shrink-0 ${className}`}>
      <PoliticianAvatar politicianId={politicianId} name={name} size={size} />
    </div>
  );
}
