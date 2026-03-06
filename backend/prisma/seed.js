const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const oldCurriculum = await prisma.curriculum.upsert({
    where: { name: 'old' },
    update: {},
    create: {
      name: 'old',
      displayName: 'Old Curriculum (C/C++)'
    }
  });

  const newCurriculum = await prisma.curriculum.upsert({
    where: { name: 'new' },
    update: {},
    create: {
      name: 'new',
      displayName: 'New Curriculum (Python)'
    }
  });

  console.log('Curricula created');

  const projects = [
    { slug: 'libft', name: 'Libft', circle: 0, minTeam: 1, maxTeam: 1, curricula: ['old', 'new'] },

    { slug: 'get_next_line', name: 'get_next_line', circle: 1, minTeam: 1, maxTeam: 1, curricula: ['old', 'new'] },
    { slug: 'ft_printf', name: 'ft_printf', circle: 1, minTeam: 1, maxTeam: 1, curricula: ['old', 'new'] },
    { slug: 'born2beroot', name: 'Born2beroot', circle: 1, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    
    { slug: 'push_swap', name: 'push_swap', circle: 1, minTeam: 1, maxTeam: 1, curricula: ['new'] },

    { slug: 'push_swap', name: 'push_swap', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'pipex', name: 'pipex', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'minitalk', name: 'minitalk', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'fract-ol', name: 'fract-ol', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'fdf', name: 'FdF', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'so_long', name: 'so_long', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['old'] },

    { slug: 'born2beroot', name: 'Born2beroot', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-00', name: 'Python Module 00', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-01', name: 'Python Module 01', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-02', name: 'Python Module 02', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-03', name: 'Python Module 03', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-04', name: 'Python Module 04', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-05', name: 'Python Module 05', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-06', name: 'Python Module 06', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-07', name: 'Python Module 07', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-08', name: 'Python Module 08', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-09', name: 'Python Module 09', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'python-module-10', name: 'Python Module 10', circle: 2, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'a-maze-ing', name: 'A-Maze-ing', circle: 2, minTeam: 2, maxTeam: 2, curricula: ['new'] },

    { slug: 'philosophers', name: 'Philosophers', circle: 3, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'minishell', name: 'minishell', circle: 3, minTeam: 2, maxTeam: 2, curricula: ['old'] },

    { slug: 'codexion', name: 'Codexion', circle: 3, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'fly-in', name: 'Fly-in', circle: 3, minTeam: 1, maxTeam: 1, curricula: ['new'] },
    { slug: 'call-me-maybe', name: 'Call Me Maybe', circle: 3, minTeam: 1, maxTeam: 1, curricula: ['new'] },

    { slug: 'cub3d', name: 'cub3D', circle: 4, minTeam: 2, maxTeam: 2, curricula: ['old'] },
    { slug: 'minirt', name: 'miniRT', circle: 4, minTeam: 2, maxTeam: 2, curricula: ['old'] },
    { slug: 'netpractice', name: 'NetPractice', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old', 'new'] },
    { slug: 'cpp-module-00', name: 'CPP Module 00', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-01', name: 'CPP Module 01', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-02', name: 'CPP Module 02', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-03', name: 'CPP Module 03', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-04', name: 'CPP Module 04', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['old'] },

    { slug: 'pac-man', name: 'Pac-Man', circle: 4, minTeam: 2, maxTeam: 2, curricula: ['new'] },
    { slug: 'rag-against-the-machine', name: 'RAG against the machine', circle: 4, minTeam: 1, maxTeam: 1, curricula: ['new'] },

    { slug: 'webserv', name: 'webserv', circle: 5, minTeam: 2, maxTeam: 3, curricula: ['old'] },
    { slug: 'ft_irc', name: 'ft_irc', circle: 5, minTeam: 2, maxTeam: 3, curricula: ['old'] },
    { slug: 'cpp-module-05', name: 'CPP Module 05', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-06', name: 'CPP Module 06', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-07', name: 'CPP Module 07', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-08', name: 'CPP Module 08', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'cpp-module-09', name: 'CPP Module 09', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old'] },
    { slug: 'inception', name: 'Inception', circle: 5, minTeam: 1, maxTeam: 1, curricula: ['old', 'new'] },

    { slug: 'agent-smith', name: 'Agent Smith', circle: 5, minTeam: 2, maxTeam: 3, curricula: ['new'] },
    { slug: 'the-answer-protocol', name: 'The Answer Protocol', circle: 5, minTeam: 2, maxTeam: 3, curricula: ['new'] },

    { slug: 'ft_transcendence', name: 'ft_transcendence', circle: 6, minTeam: 4, maxTeam: 5, curricula: ['old', 'new'] },
    { slug: '42_collaborative_resume', name: '42 Collaborative Resume', circle: 6, minTeam: 2, maxTeam: 2, curricula: ['old', 'new'] }
  ];

  for (const projectData of projects) {
    const { curricula, ...projectInfo } = projectData;
    
    const project = await prisma.project.upsert({
      where: { slug: projectData.slug },
      update: projectInfo,
      create: projectInfo
    });

    for (const curriculumName of curricula) {
      const curriculum = curriculumName === 'old' ? oldCurriculum : newCurriculum;
      
      await prisma.projectCurriculum.upsert({
        where: {
          projectId_curriculumId: {
            projectId: project.id,
            curriculumId: curriculum.id
          }
        },
        update: {},
        create: {
          projectId: project.id,
          curriculumId: curriculum.id
        }
      });
    }
  }

  console.log('Projects seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });