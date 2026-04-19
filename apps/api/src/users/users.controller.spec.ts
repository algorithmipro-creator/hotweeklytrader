import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    findOne: jest.fn(),
    updateProfile: jest.fn(),
    findReferralProfile: jest.fn(),
    findTeam: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get(UsersController);
    jest.clearAllMocks();
  });

  it('delegates /me/referral to UsersService.findReferralProfile', async () => {
    mockUsersService.findReferralProfile.mockResolvedValue({ referral_code: 'ALPHA01' });

    const result = await controller.getReferralProfile({ user_id: 'user-1' });

    expect(result).toEqual({ referral_code: 'ALPHA01' });
    expect(mockUsersService.findReferralProfile).toHaveBeenCalledWith('user-1');
  });

  it('delegates /me/team to UsersService.findTeam', async () => {
    mockUsersService.findTeam.mockResolvedValue({ summary: { team_count: 0 } });

    const result = await controller.getReferralTeam({ user_id: 'user-1' });

    expect(result).toEqual({ summary: { team_count: 0 } });
    expect(mockUsersService.findTeam).toHaveBeenCalledWith('user-1');
  });
});
