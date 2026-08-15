import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { RedeemLinkCodeDto } from './dto/redeem-link-code.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.sub, user.jti, user.exp);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  // Genera el código: lo llama el frontend con el usuario ya logueado.
  // Restringido a Cliente/Diseñador/Administrador — ver createLinkCode.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('link-code')
  createLinkCode(@CurrentUser() user: any) {
    return this.authService.createLinkCode(user.sub, user.roles);
  }

  // Canjea el código: lo llama el Lambda de Alexa, sin JWT todavía (es
  // justamente lo que este endpoint entrega) — público a propósito.
  @Post('link-code/redeem')
  redeemLinkCode(@Body() dto: RedeemLinkCodeDto) {
    return this.authService.redeemLinkCode(dto);
  }
}
