import React from 'react';
import './Team.css';

function Team() {
  const teamMembers = [
    {
      name: "JANSEN RELATOR",
      role: "Team Leader",
      description: "Oversees the overall progress of the study, ensures tasks are completed on time, and coordinates team efforts to achieve project objectives.",
      image: "images/jansen.png"
    },
    {
      name: "CLAIRE BELLE CANDIA",
      role: "Manuscript Writer",
      description: "Contributes to the research and development process by assisting in various tasks, including data collection, analysis, and documentation.",
      image: "images/claire.jpg"
    },
    {
      name: "ANTHONY NEMENZO",
      role: "Frontend Developer",
      description: "Designs and implements the user interface, ensuring a seamless and user-friendly experience for interacting with the system.",
      image: "images/anthony.jpeg"
    },
    {
      name: "JOREN VARQUEZ",
      role: "Backend Developer",
      description: "Develops and maintains the server-side logic, database integration, and APIs to ensure efficient and scalable system functionality.",
      image: "images/joren.png"
    }
  ];

  return (
    <div className="team-container">
      <h2>MEET THE TEAM</h2>
      <div className="team-members">
        {teamMembers.map((member, index) => (
          <div key={index} className="team-member">
            <img src={member.image} alt={`${member.name}`} className="team-member-image" />
            <h3>{member.name}</h3>
            <p className="team-member-role">{member.role}</p>
            <p className="team-member-description">{member.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Team;