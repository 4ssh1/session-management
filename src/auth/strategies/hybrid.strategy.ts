import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { SessionService } from "../../session/session.service";
import { UsersService } from "src/users/users.service";

@Injectable()
export class HybridStrategy extends PassportStrategy(Strategy, "hybrid") {
    constructor(
        private readonly sessionService: SessionService,
        private readonly configService: ConfigService,
        private readonly userService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_SECRET')!,
            ignoreExpiration: false,
        });
    }

    async validate(payload: any) {
        const isWhitelisted = await this.sessionService.isTokenWhitelisted(payload.jti);
        if (!isWhitelisted) {
            throw new UnauthorizedException('Token is not whitelisted');
        }
        const user = await this.userService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return { userId: user.id, email: user.email, name: user.name, tokenId: payload.jti };
    }
}