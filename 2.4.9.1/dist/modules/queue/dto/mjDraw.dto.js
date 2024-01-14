"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MjDrawDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class MjDrawDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'close-up polaroid photo, of a little joyful cute panda, in the forest, sun rays coming, photographic, sharp focus, depth of field, soft lighting, heigh quality, 24mm, Nikon Z FX',
        description: '绘画提示词！',
        required: true,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MjDrawDto.prototype, "prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '--ar 16:9 --c 0', description: '除了prompt的额外参数' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MjDrawDto.prototype, "extraParam", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://xsdasdasd.com', description: '垫图图片地址' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MjDrawDto.prototype, "imgUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: '绘画动作 绘图、放大、变换、图生图' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], MjDrawDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: '变体或者放大的序号' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], MjDrawDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: '绘画的DBID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], MjDrawDto.prototype, "drawId", void 0);
exports.MjDrawDto = MjDrawDto;
