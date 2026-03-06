const prisma = require('../prisma');

const teamController = {
  async createTeam(req, res) {
    try {
      const { name, projectSlug, memberIds } = req.body;

      if (!name || !projectSlug || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // 42 projects: only 42 intra users can be invited
      if (!project.isUserCreated && memberIds.length > 0) {
        const creator = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!creator?.intraId) {
          return res.status(403).json({ error: 'Only 42 intra users can form teams on 42 projects.' });
        }
        const invitees = await prisma.user.findMany({
          where: { id: { in: memberIds.map(id => parseInt(id)) } },
          select: { id: true, login: true, intraId: true }
        });
        const nonIntra = invitees.filter(u => !u.intraId);
        if (nonIntra.length > 0) {
          return res.status(400).json({
            error: `Cannot invite non-42 users to a 42 project: ${nonIntra.map(u => u.login).join(', ')}`
          });
        }
      }

      const creatorTeam = await prisma.team.findFirst({
        where: { projectId: project.id, members: { some: { userId: req.userId } } }
      });
      if (creatorTeam) {
        return res.status(400).json({ error: 'You already have a team for this project' });
      }

      const creatorPendingInvite = await prisma.teamMember.findFirst({
        where: {
          userId: req.userId,
          status: 'pending',
          team: { projectId: project.id, status: 'pending' }
        }
      });
      if (creatorPendingInvite) {
        return res.status(400).json({ error: 'You have a pending team invite for this project. Accept or decline it first.' });
      }

      for (const memberId of memberIds) {
        const memberTeam = await prisma.team.findFirst({
          where: { projectId: project.id, members: { some: { userId: parseInt(memberId) } } }
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
          members: { some: { userId: req.userId, status: 'pending' } }
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

      if (!team) return res.status(404).json({ error: 'Team not found' });

      const member = team.members.find(m => m.userId === req.userId);
      if (!member) return res.status(403).json({ error: 'Not a team member' });

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
        // Declining removes just this member, not the whole team —
        // the creator can re-invite someone else if they want
        await prisma.teamMember.delete({ where: { id: member.id } });

        // If only the creator is left and they're approved, activate the team
        const updatedTeam = await prisma.team.findUnique({
          where: { id: parseInt(teamId) },
          include: { members: true }
        });

        if (updatedTeam.members.length === 0) {
          await prisma.team.delete({ where: { id: parseInt(teamId) } });
          return res.json({ deleted: true });
        }

        const allApproved = updatedTeam.members.every(m => m.status === 'approved');
        if (allApproved) {
          await prisma.team.update({
            where: { id: parseInt(teamId) },
            data: { status: 'approved' }
          });
        }

        res.json({ declined: true });
      }
    } catch (error) {
      console.error('Respond to invite error:', error);
      res.status(500).json({ error: 'Failed to respond to invite' });
    }
  },

  async inviteToTeam(req, res) {
    try {
      const { memberIds, projectSlug } = req.body;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: 'memberIds is required.' });
      }
      if (!projectSlug) {
        return res.status(400).json({ error: 'projectSlug is required.' });
      }

      // Find the creator's team for this project
      const team = await prisma.team.findFirst({
        where: {
          creatorId: req.userId,
          project: { slug: projectSlug, isUserCreated: true }
        },
        include: { project: true, members: true }
      });

      if (!team) return res.status(404).json({ error: 'No team found for this project. Create the project first.' });
      if (team.creatorId !== req.userId) return res.status(403).json({ error: 'Only the team creator can invite members.' });

      const newIds = memberIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      const existingIds = new Set(team.members.map(m => m.userId));
      const toAdd = newIds.filter(id => !existingIds.has(id));

      if (toAdd.length === 0) {
        return res.status(400).json({ error: 'All specified users are already in the team.' });
      }

      await prisma.$transaction([
        ...toAdd.map(userId =>
          prisma.teamMember.create({ data: { teamId: team.id, userId, status: 'pending' } })
        ),
        prisma.team.update({ where: { id: team.id }, data: { status: 'pending' } })
      ]);

      const updated = await prisma.team.findUnique({
        where: { id: team.id },
        include: { members: { include: { user: true } }, project: true, creator: true }
      });

      res.json(updated);
    } catch (error) {
      console.error('Invite to team error:', error);
      res.status(500).json({ error: 'Failed to invite members.' });
    }
  },

  async getMyTeams(req, res) {
    try {
      const teams = await prisma.team.findMany({
        where: {
          members: { some: { userId: req.userId, status: 'approved' } }
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
        const formatted = { ...team, deleteRequest: null, isPending: false };

        // A team is "pending acceptance" when it's not fully approved yet —
        // meaning some invited members haven't responded. We only show this
        // state to the creator so they can track progress.
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

  async removeTeamMember(req, res) {
    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true }
      });

      if (!team) return res.status(404).json({ error: 'Team not found' });

      // Only the team creator can remove members
      if (team.creatorId !== req.userId) {
        return res.status(403).json({ error: 'Only the team creator can remove members' });
      }

      // Creator cannot remove themselves
      if (memberId === req.userId) {
        return res.status(400).json({ error: 'You cannot remove yourself. Delete the team instead.' });
      }

      const member = team.members.find(m => m.userId === memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found in this team' });
      }

      await prisma.teamMember.delete({ where: { id: member.id } });

      // Re-check team after removal
      const updatedTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true }
      });

      // If all remaining members are approved, activate the team
      if (updatedTeam.members.length > 0) {
        const allApproved = updatedTeam.members.every(m => m.status === 'approved');
        if (allApproved && team.status !== 'approved') {
          await prisma.team.update({
            where: { id: teamId },
            data: { status: 'approved' }
          });
        }
      }

      return res.json({ removed: true });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  },

  async deleteTeam(req, res) {
    try {
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: { members: true }
      });

      if (!team) return res.status(404).json({ error: 'Team not found' });

      const isMember = team.members.some(m => m.userId === req.userId);
      if (!isMember) return res.status(403).json({ error: 'Not a team member' });

      await prisma.team.delete({ where: { id: parseInt(teamId) } });
      return res.json({ deleted: true });
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
        include: { members: true, deleteRequest: true }
      });

      if (!team) return res.status(404).json({ error: 'Team not found' });

      const isMember = team.members.some(m => m.userId === req.userId);
      if (!isMember) return res.status(403).json({ error: 'Not a team member' });

      // Creator skips the approval flow entirely — instant delete
      if (team.creatorId === req.userId) {
        await prisma.team.delete({ where: { id: parseInt(teamId) } });
        return res.json({ deleted: true });
      }

      // Non-creator members go through the approval flow
      if (team.deleteRequest && team.deleteRequest.status === 'pending') {
        return res.status(400).json({ error: 'Delete request already pending' });
      }

      if (team.deleteRequest) {
        await prisma.deleteRequest.delete({ where: { id: team.deleteRequest.id } });
      }

      if (team.members.length === 1) {
        await prisma.team.delete({ where: { id: parseInt(teamId) } });
        return res.json({ deleted: true });
      }

      const deleteRequest = await prisma.deleteRequest.create({
        data: {
          teamId: parseInt(teamId),
          requesterId: req.userId,
          status: 'pending',
          approvals: {
            create: { userId: req.userId, approved: true }
          }
        },
        include: {
          requester: { select: { id: true, login: true } },
          approvals: true
        }
      });

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
          team: { members: { some: { userId: req.userId } } }
        },
        include: {
          team: { include: { project: true, members: true } },
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

      if (!deleteRequest) return res.status(404).json({ error: 'Delete request not found' });
      if (deleteRequest.status !== 'pending') return res.status(400).json({ error: 'Delete request is no longer pending' });

      const isMember = deleteRequest.team.members.some(m => m.userId === req.userId);
      if (!isMember) return res.status(403).json({ error: 'Not a team member' });

      const alreadyResponded = deleteRequest.approvals.some(a => a.userId === req.userId);
      if (alreadyResponded) return res.status(400).json({ error: 'Already responded to this request' });

      if (accept) {
        await prisma.deleteApproval.create({
          data: { deleteRequestId: parseInt(requestId), userId: req.userId, approved: true }
        });

        const updatedRequest = await prisma.deleteRequest.findUnique({
          where: { id: parseInt(requestId) },
          include: { team: { include: { members: true } }, approvals: true }
        });

        const approvedCount = updatedRequest.approvals.filter(a => a.approved).length;
        const totalMembers = updatedRequest.team.members.length;

        if (approvedCount >= totalMembers) {
          await prisma.team.delete({ where: { id: deleteRequest.teamId } });
          return res.json({ deleted: true });
        }

        res.json({ success: true, approvalCount: approvedCount, totalMembers });
      } else {
        await prisma.deleteRequest.update({
          where: { id: parseInt(requestId) },
          data: { status: 'rejected' }
        });
        res.json({ rejected: true });
      }
    } catch (error) {
      console.error('Respond to delete request error:', error);
      res.status(500).json({ error: 'Failed to respond to delete request' });
    }
  }
};

module.exports = teamController;