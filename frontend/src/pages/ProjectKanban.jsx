import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ProjectKanban.css';

const ProjectKanban = () => {
  const { projectId, slug } = useParams();
  const navigate = useNavigate();
  
  const projectName = slug?.replace(/-/g, ' ').replace(/_/g, ' ') || `Project ${projectId}`;

  const columns = [
    { key: 'todo', title: 'To Do' },
    { key: 'inProgress', title: 'In Progress' },
    { key: 'review', title: 'Review' },
    { key: 'done', title: 'Done' }
  ];

  return (
    <div className="kanban-page">
      <header className="kanban-header">
        <button className="back-btn" onClick={() => navigate('/dashboard', { replace: true })}>Back</button>
        <h1>{projectName}</h1>
        <div className="header-spacer"></div>
      </header>

      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.key} className="kanban-column">
            <div className="column-header">
              <h3>{col.title}</h3>
              <span className="task-count">0</span>
            </div>
            <div className="column-content">
              <div className="empty-column">No tasks</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectKanban;
