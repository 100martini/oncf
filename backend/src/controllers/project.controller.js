// project.controller.js
const prisma = require('../prisma');

const projectController = {
  async getProjects(req, res) {
    try {
      const { curriculum, circle } = req.query;
      const where = {};
      if (circle !== undefined) where.circle = parseInt(circle);

      const projects = await prisma.project.findMany({
        where,
        include: {
          projectCurricula: {
            include: { curriculum: true }
          }
        },
        orderBy: [{ circle: 'asc' }, { name: 'asc' }]
      });

      let filteredProjects = projects;
      if (curriculum) {
        filteredProjects = projects.filter(project =>
          project.projectCurricula.some(pc => pc.curriculum.name === curriculum)
        );
      }

      res.json(filteredProjects.map(project => ({
        id: project.id,
        slug: project.slug,
        name: project.name,
        circle: project.circle,
        minTeam: project.minTeam,
        maxTeam: project.maxTeam,
        isOuterCore: project.isOuterCore,
        curricula: project.projectCurricula.map(pc => pc.curriculum.name)
      })));
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
            include: { curriculum: true }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        id: project.id,
        slug: project.slug,
        name: project.name,
        circle: project.circle,
        minTeam: project.minTeam,
        maxTeam: project.maxTeam,
        isOuterCore: project.isOuterCore,
        curricula: project.projectCurricula.map(pc => pc.curriculum.name)
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  },

  async createCustomProject(req, res) {
    const { name, description, minTeam, maxTeam, deadline, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }
    if (!minTeam || minTeam < 1) {
      return res.status(400).json({ error: 'Minimum team size must be at least 1.' });
    }
    if (maxTeam && maxTeam < minTeam) {
      return res.status(400).json({ error: 'Maximum team size cannot be less than minimum.' });
    }

    try {
      const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-user-${req.userId}`;

      const existing = await prisma.project.findUnique({ where: { slug } });
      if (existing) {
        return res.status(409).json({ error: 'You already have a project with this name.' });
      }

      // Transaction ensures project + team are created atomically.
      // If team creation fails, the project is rolled back too.
      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            slug,
            name: name.trim(),
            description: description?.trim() || null,
            deadline: deadline ? new Date(deadline) : null,
            minTeam: minTeam || 1,
            maxTeam: maxTeam || minTeam || 1,
            circle: 0,
            isOuterCore: false,
            isUserCreated: true,
            createdById: req.userId
          }
        });

        const invitees = Array.isArray(memberIds)
          ? memberIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id !== req.userId)
          : [];

        const team = await tx.team.create({
          data: {
            name: `${name.trim()} Team`,
            projectId: project.id,
            creatorId: req.userId,
            status: invitees.length > 0 ? 'pending' : 'approved',
            members: {
              create: [
                { userId: req.userId, status: 'approved' },
                ...invitees.map(userId => ({ userId, status: 'pending' }))
              ]
            }
          }
        });

        return { project, team };
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Create custom project error:', error.message);
      res.status(500).json({ error: 'Failed to create project.' });
    }
  },

  async getMyCustomProjects(req, res) {
    try {
      const projects = await prisma.project.findMany({
        where: {
          isUserCreated: true,
          OR: [
            { createdById: req.userId },
            {
              teams: {
                some: {
                  members: {
                    some: { userId: req.userId } // include pending invitees too
                  }
                }
              }
            }
          ]
        },
        include: {
          createdBy: {
            select: { id: true, login: true, displayName: true, avatar: true, customAvatar: true }
          },
          teams: {
            where: {
              members: {
                some: { userId: req.userId }  // includes both approved and pending members
              }
            },
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, login: true, avatar: true, customAvatar: true, nickname: true }
                  }
                }
              }
            }
          }
        }
      });

      res.json(projects);
    } catch (error) {
      console.error('Get custom projects error:', error.message);
      res.status(500).json({ error: 'Failed to fetch projects.' });
    }
  },
  async deleteCustomProject(req, res) {
  try {
    const projectId = parseInt(req.params.projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { teams: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only user-created projects can be deleted this way
    if (!project.isUserCreated) {
      return res.status(403).json({ error: 'Cannot delete 42 projects' });
    }

    // Only the creator can delete their project
    if (project.createdById !== req.userId) {
      return res.status(403).json({ error: 'Only the project creator can delete it' });
    }

    // Cascade: deleting the project also deletes all its teams and members
    // because of the onDelete: Cascade on the Team → Project relation in schema.
    // No need to manually delete teams — Prisma handles it.
    await prisma.project.delete({ where: { id: projectId } });

    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete custom project error:', error.message);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}
};

module.exports = projectController;