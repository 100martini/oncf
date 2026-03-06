const prisma = require('../prisma');

const teamController = {
  async createTeam(req, res) {
    try {
      const { name, projectSlug, memberIds } = req.body;

      if (!name || !projectSlug || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const creatorTeam = await prisma.team.findFirst({
        where: {
          projectId: project.id,
          members: { some: { userId: req.userId } }
        }
      });
      if (creatorTeam) {
        return res.status(400).json({ error: 'You already have a team for this project' });
      }

      const creatorPendingInvite = await prisma.teamMember.findFirst({
        where: {
          userId: req.userId,
          status: 'pending',
          team: {
            projectId: project.id,
            status: 'pending'
          }
        }
      });
      if (creatorPendingInvite) {
        return res.status(400).json({ error: 'You have a pending team invite for this project. Accept or decline it first.' });
      }

      for (const memberId of memberIds) {
        const memberTeam = await prisma.team.findFirst({
          where: {
            projectId: project.id,
            members: { some: { userId: parseInt(memberId) } }
          }
        });
        if (memberTeam) {
          const memberUser = await prisma.user.findUnique({ where: { id: parseInt(memberId) } });
          return res.status(400).json({ error: `${memberUser?.login || 'A member'} already has a team for this project` });
        }
      }

      const team = await prisma.team.create({
        data: {
          name,
          projectId: project.id,
          creatorId: req.userId,
          status: 'pending',
          members: {
            create: [
              { userId: req.userId, status: 'approved' },
              ...memberIds.map(userId => ({ userId: parseInt(userId), status: 'pending' }))
            ]
          }
        },
        include: { members: { include: { user: true } }, project: true, creator: true }
      });

      res.json(team);
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  },

  async getPendingInvites(req, res) {
    try {
      const teams = await prisma.team.findMany({
        where: {
          status: 'pending',
          members: { some: { userId: req.userId } },
          creatorId: { not: req.userId }
        },
        include: { members: { include: { user: true } }, project: true, creator: true },
        orderBy: { createdAt: 'desc' }
      });

      const formattedTeams = teams.map(team => {
        const myMember = team.members.find(m => m.userId === req.userId);
        return {
          ...team,
          acceptanceCount: team.members.filter(m => m.status === 'approved').length,
          totalMembers: team.members.length,
          myStatus: myMember?.status || 'pending'
        };
      });

      res.json(formattedTeams);
    } catch (error) {
      console.error('Get pending invites error:', error);
      res.status(500).json({ error: 'Failed to fetch pending invites' });
    }
  },

  async respondToInvite(req, res) {
    try {
      const { teamId } = req.params;
      const { accept } = req.body;

      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: { members: true }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const member = team.members.find(m => m.userId === req.userId);
      if (!member) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      if (accept) {
        await prisma.teamMember.update({
          where: { id: member.id },
          data: { status: 'approved' }
        });

        const updatedTeam = await prisma.team.findUnique({
          where: { id: parseInt(teamId) },
          include: { members: true }
        });

        const allApproved = updatedTeam.members.every(m => m.status === 'approved');
        if (allApproved) {
          await prisma.team.update({
            where: { id: parseInt(teamId) },
            data: { status: 'approved' }
          });
        }

        res.json({
          success: true,
          acceptanceCount: updatedTeam.members.filter(m => m.status === 'approved').length,
          totalMembers: updatedTeam.members.length,
          isActive: allApproved
        });
      } else {
        await prisma.team.delete({ where: { id: parseInt(teamId) } });
        res.json({ deleted: true });
      }
    } catch (error) {
      console.error('Respond to invite error:', error);
      res.status(500).json({ error: 'Failed to respond to invite' });
    }
  },

  async getMyTeams(req, res) {
    try {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { members: { some: { userId: req.userId } }, status: 'approved' },
            { members: { some: { userId: req.userId, status: 'approved' } }, status: 'pending' }
          ]
        },
        include: {
          members: { include: { user: true } },
          project: true,
          creator: true,
          deleteRequest: {
            include: {
              requester: { select: { id: true, login: true } },
              approvals: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedTeams = teams.map(team => {
        const formatted = {
          ...team,
          deleteRequest: null
        };

        if (team.status === 'pending') {
          formatted.acceptanceCount = team.members.filter(m => m.status === 'approved').length;
          formatted.totalMembers = team.members.length;
          formatted.isPending = true;
        }

        if (team.deleteRequest && team.deleteRequest.status === 'pending') {
          formatted.deleteRequest = {
            id: team.deleteRequest.id,
            requestedBy: team.deleteRequest.requester,
            requestedByLogin: team.deleteRequest.requester.login,
            approvalCount: team.deleteRequest.approvals.filter(a => a.approved).length,
            totalMembers: team.members.length,
            teamName: team.name
          };
        }

        return formatted;
      });

      res.json(formattedTeams);
    } catch (error) {
      console.error('Get my teams error:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  async deleteTeam(req, res) {
    try {
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: { members: true }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const isMember = team.members.some(m => m.userId === req.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      if (team.members.length === 1 || (team.status === 'pending' && team.creatorId === req.userId)) {
        await prisma.team.delete({ where: { id: parseInt(teamId) } });
        return res.json({ deleted: true });
      }

      return res.status(400).json({ error: 'Use delete request for approved teams with multiple members' });
    } catch (error) {
      console.error('Delete team error:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  },

  async requestDeleteTeam(req, res) {
    try {
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: {
          members: true,
          deleteRequest: true
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const isMember = team.members.some(m => m.userId === req.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      if (team.deleteRequest && team.deleteRequest.status === 'pending') {
        return res.status(400).json({ error: 'Delete request already pending' });
      }

      if (team.deleteRequest) {
        await prisma.deleteRequest.delete({ where: { id: team.deleteRequest.id } });
      }

      const deleteRequest = await prisma.deleteRequest.create({
        data: {
          teamId: parseInt(teamId),
          requesterId: req.userId,
          status: 'pending',
          approvals: {
            create: {
              userId: req.userId,
              approved: true
            }
          }
        },
        include: {
          requester: { select: { id: true, login: true } },
          approvals: true
        }
      });

      if (team.members.length === 1) {
        await prisma.team.delete({ where: { id: parseInt(teamId) } });
        return res.json({ deleted: true });
      }

      res.json({
        id: deleteRequest.id,
        teamId: parseInt(teamId),
        requestedBy: deleteRequest.requester,
        approvalCount: 1,
        totalMembers: team.members.length,
        status: 'pending'
      });
    } catch (error) {
      console.error('Request delete team error:', error);
      res.status(500).json({ error: 'Failed to request deletion' });
    }
  },

  async getDeleteRequests(req, res) {
    try {
      const deleteRequests = await prisma.deleteRequest.findMany({
        where: {
          status: 'pending',
          requesterId: { not: req.userId },
          team: {
            members: { some: { userId: req.userId } }
          }
        },
        include: {
          team: {
            include: {
              project: true,
              members: true
            }
          },
          requester: { select: { id: true, login: true } },
          approvals: true
        }
      });

      const formatted = deleteRequests.map(dr => {
        const myApproval = dr.approvals.find(a => a.userId === req.userId);
        return {
          id: dr.id,
          teamId: dr.teamId,
          teamName: dr.team.name,
          project: { name: dr.team.project.name, slug: dr.team.project.slug },
          requestedBy: dr.requester,
          approvalCount: dr.approvals.filter(a => a.approved).length,
          totalMembers: dr.team.members.length,
          status: dr.status,
          myStatus: myApproval ? (myApproval.approved ? 'approved' : 'rejected') : 'pending'
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Get delete requests error:', error);
      res.status(500).json({ error: 'Failed to fetch delete requests' });
    }
  },

  async respondToDeleteRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { accept } = req.body;

      const deleteRequest = await prisma.deleteRequest.findUnique({
        where: { id: parseInt(requestId) },
        include: {
          team: { include: { members: true } },
          approvals: true
        }
      });

      if (!deleteRequest) {
        return res.status(404).json({ error: 'Delete request not found' });
      }

      if (deleteRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Delete request is no longer pending' });
      }

      const isMember = deleteRequest.team.members.some(m => m.userId === req.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      const alreadyResponded = deleteRequest.approvals.some(a => a.userId === req.userId);
      if (alreadyResponded) {
        return res.status(400).json({ error: 'Already responded to this request' });
      }

      if (accept) {
        await prisma.deleteApproval.create({
          data: {
            deleteRequestId: parseInt(requestId),
            userId: req.userId,
            approved: true
          }
        });

        const updatedRequest = await prisma.deleteRequest.findUnique({
          where: { id: parseInt(requestId) },
          include: {
            team: { include: { members: true } },
            approvals: true
          }
        });

        const approvedCount = updatedRequest.approvals.filter(a => a.approved).length;
        const totalMembers = updatedRequest.team.members.length;

        if (approvedCount >= totalMembers) {
          await prisma.team.delete({ where: { id: deleteRequest.teamId } });
          return res.json({ deleted: true, message: 'All members approved. Team deleted.' });
        }

        res.json({
          success: true,
          approvalCount: approvedCount,
          totalMembers: totalMembers
        });
      } else {
        await prisma.deleteRequest.update({
          where: { id: parseInt(requestId) },
          data: { status: 'rejected' }
        });

        res.json({ rejected: true, message: 'Delete request rejected' });
      }
    } catch (error) {
      console.error('Respond to delete request error:', error);
      res.status(500).json({ error: 'Failed to respond to delete request' });
    }
  }
};

module.exports = teamController;