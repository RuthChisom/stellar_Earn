import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import {
  ChallengeRequestDto,
  ChallengeResponseDto,
  LoginDto,
  TokenResponseDto,
  RefreshTokenDto,
  UserResponseDto,
} from './dto/auth.dto';
import { TwoFactorLoginDto } from './dto/two-factor.dto';
import { TwoFactorService } from './services/two-factor.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 10 })
  @ApiOperation({ summary: 'Generate authentication challenge' })
  @ApiResponse({
    status: 200,
    description: 'Challenge generated successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async generateChallenge(
    @Body() dto: ChallengeRequestDto,
  ): Promise<ChallengeResponseDto> {
    return this.authService.generateChallenge(dto.stellarAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 5 })
  @ApiOperation({
    summary: 'Login with Stellar wallet signature',
    description:
      'Authenticates using a Stellar wallet signature. ' +
      'If 2FA is enabled for the account, a valid `totpCode` must also be provided.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature, expired challenge, or invalid 2FA code',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() loginDto: TwoFactorLoginDto): Promise<TokenResponseDto> {
    return this.authService.verifySignatureAndLoginWith2fa(
      loginDto,
      this.twoFactorService,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 10 })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return {
      stellarAddress: user.stellarAddress,
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: AuthUser): Promise<{ message: string }> {
    await this.authService.revokeToken(user.stellarAddress);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<{ message: string }> {
    await this.authService.revokeToken(user.stellarAddress);
    return { message: 'All sessions logged out successfully' };
  }
}
