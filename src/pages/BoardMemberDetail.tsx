import { useParams } from "react-router-dom";
import { BoardOfDirectors } from "../db";

export default function BoardMemberDetail() {
  const { id } = useParams();
  const member = BoardOfDirectors.find((m) => m.id === parseInt(id || "0"));

  if (!member) {
    return <h2>Board Member Not Found</h2>;
  }

  return (
    <section className="w-full min-h-screen p-4 bg-[#98916D]">
      <div className="w-full h-full flex flex-col justify-center items-center">
        <img
          src={member.image}
          alt={member.position}
          className="w-50 rounded-full h-50 object-cover"
        />
        <div className="text-center">
          <h3 className="font-serif text-xl">{member.name}</h3>
          <p className="font-serif text-black/50 text-sm">{member.position}</p>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {member.about.map((item) => (
            <p key={item.id}>{item.text}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
