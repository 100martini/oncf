const prisma = require('../prisma');

const projectController = {
  async getProjects(req, res) {
    try {
      const { curriculum, circle } = req.query;

      const where = {};

      if (circle !== undefined)
        where.circle = parseInt(circle);

      const projects = await prisma.project.findMany({
        where,
        include: {
          projectCurricula: {
            include: {
              curriculum: true
            }
          }
        },
        orderBy: [
          { circle: 'asc' },
          { name: 'asc' }
        ]
      });

      let filteredProjects = projects;
      if (curriculum) {
        filteredProjects = projects.filter(project =>
          project.projectCurricula.some(pc => pc.curriculum.name === curriculum)
        );
      }

      const formattedProjects = filteredProjects.map(project => {
        const curriculaCircles = {};
        project.projectCurricula.forEach(pc => {
          curriculaCircles[pc.curriculum.name] = pc.circle ?? project.circle;
        });

        return {
          id: project.id,
          slug: project.slug,
          name: project.name,
          circle: project.circle,
          minTeam: project.minTeam,
          maxTeam: project.maxTeam,
          isOuterCore: project.isOuterCore,
          curricula: project.projectCurricula.map(pc => pc.curriculum.name),
          curriculaCircles
        };
      });

      res.json(formattedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  },

  async getProjectBySlug(req, res) {
    try {
      const { slug } = req.params;

      const project = await prisma.project.findUnique({
        where: { slug },
        include: {
          projectCurricula: {
            include: {
              curriculum: true
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const curriculaCircles = {};
      project.projectCurricula.forEach(pc => {
        curriculaCircles[pc.curriculum.name] = pc.circle ?? project.circle;
      });

      res.json({
        id: project.id,
        slug: project.slug,
        name: project.name,
        circle: project.circle,
        minTeam: project.minTeam,
        maxTeam: project.maxTeam,
        isOuterCore: project.isOuterCore,
        curricula: project.projectCurricula.map(pc => pc.curriculum.name),
        curriculaCircles
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }
};

module.exports = projectController;
