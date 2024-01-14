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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserBalanceService = void 0;
const globalConfig_service_1 = require("./../globalConfig/globalConfig.service");
const typeorm_1 = require("@nestjs/typeorm");
const balance_entity_1 = require("./balance.entity");
const common_1 = require("@nestjs/common");
const typeorm_2 = require("typeorm");
const balance_constant_1 = require("../../common/constants/balance.constant");
const accountLog_entity_1 = require("./accountLog.entity");
const utils_1 = require("../../common/utils");
const config_entity_1 = require("../globalConfig/config.entity");
const cramiPackage_entity_1 = require("../crami/cramiPackage.entity");
const userBalance_entity_1 = require("./userBalance.entity");
const date_1 = require("../../common/utils/date");
const user_entity_1 = require("../user/user.entity");
const salesUsers_entity_1 = require("../sales/salesUsers.entity");
const sales_service_1 = require("../sales/sales.service");
const whiteList_entity_1 = require("../chatgpt/whiteList.entity");
const fingerprint_entity_1 = require("./fingerprint.entity");
const chatLog_entity_1 = require("../chatLog/chatLog.entity");
const chatGroup_entity_1 = require("../chatGroup/chatGroup.entity");
const midjourney_entity_1 = require("../midjourney/midjourney.entity");
let UserBalanceService = class UserBalanceService {
    constructor(balanceEntity, userBalanceEntity, accountLogEntity, cramiPackageEntity, configEntity, userEntity, salesUsersEntity, whiteListEntity, fingerprintLogEntity, chatGroupEntity, chatLogEntity, midjourneyEntity, salesService, globalConfigService) {
        this.balanceEntity = balanceEntity;
        this.userBalanceEntity = userBalanceEntity;
        this.accountLogEntity = accountLogEntity;
        this.cramiPackageEntity = cramiPackageEntity;
        this.configEntity = configEntity;
        this.userEntity = userEntity;
        this.salesUsersEntity = salesUsersEntity;
        this.whiteListEntity = whiteListEntity;
        this.fingerprintLogEntity = fingerprintLogEntity;
        this.chatGroupEntity = chatGroupEntity;
        this.chatLogEntity = chatLogEntity;
        this.midjourneyEntity = midjourneyEntity;
        this.salesService = salesService;
        this.globalConfigService = globalConfigService;
    }
    async addBalanceToNewUser(userId, invitedId) {
        try {
            const registerConfigs = await this.configEntity.find({
                where: {
                    configKey: (0, typeorm_2.In)([
                        'registerSendStatus',
                        'registerSendModel3Count',
                        'registerSendModel4Count',
                        'registerSendDrawMjCount',
                        'firstRegisterSendStatus',
                        'firstRegisterSendRank',
                        'firstRregisterSendModel3Count',
                        'firstRregisterSendModel4Count',
                        'firstRregisterSendDrawMjCount',
                        'inviteSendStatus',
                        'inviteGiveSendModel3Count',
                        'inviteGiveSendModel4Count',
                        'inviteGiveSendDrawMjCount',
                        'invitedGuestSendModel3Count',
                        'invitedGuestSendDrawMjCount',
                        'invitedGuestSendModel4Count',
                    ]),
                },
            });
            const configMap = registerConfigs.reduce((pre, cur) => {
                const num = Number(cur.configVal);
                const n = Number.isInteger(num) && num > 0 ? num : 0;
                pre[cur.configKey] = n;
                return pre;
            }, {});
            let model3Count = 0;
            let model4Count = 0;
            let drawMjCount = 0;
            if (configMap.registerSendStatus === 1) {
                model3Count = model3Count + configMap.registerSendModel3Count;
                model4Count = model4Count + configMap.registerSendModel4Count;
                drawMjCount = drawMjCount + configMap.registerSendDrawMjCount;
            }
            if (configMap.registerSendStatus === 1 && configMap.firstRegisterSendStatus === 1 && userId <= configMap.firstRegisterSendRank) {
                model3Count = model3Count + configMap.firstRregisterSendModel3Count;
                model4Count = model4Count + configMap.firstRregisterSendModel4Count;
                drawMjCount = drawMjCount + configMap.firstRregisterSendDrawMjCount;
            }
            await this.saveRecordRechargeLog({ userId, rechargeType: balance_constant_1.RechargeType.REG_GIFT, model3Count, drawMjCount, model4Count });
            if (invitedId) {
                if (Number(configMap.inviteSendStatus) === 1) {
                    model3Count = model3Count + Number(configMap.invitedGuestSendModel3Count);
                    model4Count = model4Count + Number(configMap.invitedGuestSendModel4Count);
                    drawMjCount = drawMjCount + Number(configMap.invitedGuestSendDrawMjCount);
                    await this.saveRecordRechargeLog({
                        userId,
                        rechargeType: balance_constant_1.RechargeType.INVITE_GIFT,
                        model3Count: configMap.invitedGuestSendModel3Count,
                        model4Count: configMap.invitedGuestSendModel4Count,
                        drawMjCount: configMap.invitedGuestSendDrawMjCount,
                    });
                    await this.addBalanceToUser(invitedId, {
                        model3Count: configMap.inviteGiveSendModel3Count,
                        model4Count: configMap.inviteGiveSendModel4Count,
                        drawMjCount: configMap.inviteGiveSendDrawMjCount,
                    });
                    await this.saveRecordRechargeLog({
                        userId: invitedId,
                        rechargeType: balance_constant_1.RechargeType.REFER_GIFT,
                        model3Count: configMap.inviteGiveSendModel3Count,
                        model4Count: configMap.inviteGiveSendModel4Count,
                        drawMjCount: configMap.inviteGiveSendDrawMjCount,
                    });
                }
            }
            await this.userBalanceEntity.save({ userId, model3Count, model4Count, drawMjCount, useTokens: 0 });
        }
        catch (error) {
            console.log('error: ', error);
            throw new common_1.HttpException('注册赠送失败,请联系管理员！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async validateBalance(req, type, amount) {
        const { id: userId, role } = req.user;
        let b = await this.userBalanceEntity.findOne({ where: { userId } });
        if (!b) {
            b = await this.createBaseUserBalance(userId);
        }
        if (role === 'visitor') {
            return this.validateVisitorBalance(req, type, amount);
        }
        const res = await this.configEntity.findOne({ where: { configKey: 'vxNumber' } });
        const vxNumber = res ? res.configVal : '---';
        const memberKey = type === 'model3' ? 'memberModel3Count' : type === 'model4' ? 'memberModel4Count' : type === 'mjDraw' ? 'memberDrawMjCount' : null;
        const baseKey = type === 'model3' ? 'model3Count' : type === 'model4' ? 'model4Count' : type === 'mjDraw' ? 'drawMjCount' : null;
        if (b.packageId && b[memberKey] < amount) {
            if (b[baseKey] < amount) {
                throw new common_1.HttpException(`您的账户余额不足,如果想继续体验服务,请联系管理员 <VX: ${vxNumber}> 或购买专属套餐 ！`, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
        }
        if (!b.packageId && b[baseKey] < amount) {
            throw new common_1.HttpException(`您的账户余额不足,如果想继续体验服务,请联系管理员 <VX: ${vxNumber}> 或购买专属套餐 ！`, common_1.HttpStatus.PAYMENT_REQUIRED);
        }
        return b;
    }
    async validateVisitorBalance(req, type, amount) {
        const { id } = req.user;
        const baseKey = type === 'model3' ? 'model3Count' : type === 'model4' ? 'model4Count' : type === 'mjDraw' ? 'drawMjCount' : null;
        const now = new Date();
        const log = await this.fingerprintLogEntity.findOne({ where: { fingerprint: id } });
        const { visitorModel3Num, visitorModel4Num, visitorMJNum } = await this.globalConfigService.getConfigs(['visitorModel3Num', 'visitorModel4Num', 'visitorMJNum']);
        const settings = {
            model3Count: visitorModel3Num ? Number(visitorModel3Num) : 0,
            model4Count: visitorModel4Num ? Number(visitorModel4Num) : 0,
            drawMjCount: visitorMJNum ? Number(visitorMJNum) : 0
        };
        if (!log) {
            let data = {
                fingerprint: id,
                model3Count: 0,
                model4Count: 0,
                drawMjCount: 0
            };
            data[baseKey] = data[baseKey] + amount;
            if (data[baseKey] > settings[baseKey]) {
                throw new common_1.HttpException(`今日当前类型免费额度已经使用完毕、建议您注册账户体验更加完整的服务内容！`, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            else {
                await this.fingerprintLogEntity.save(data);
                return true;
            }
        }
        else {
            const { model3Count, model4Count, drawMjCount } = log;
            let data = {
                model3Count,
                model4Count,
                drawMjCount
            };
            const date = Number(new Date(log.updatedAt));
            const isUpdateLastDay = this.isUpdatedToday(date);
            if (isUpdateLastDay) {
                data[baseKey] = data[baseKey] + amount;
            }
            else {
                data = {
                    model3Count: 0,
                    model4Count: 0,
                    drawMjCount: 0
                };
                data[baseKey] = data[baseKey] + amount;
            }
            if (data[baseKey] > settings[baseKey]) {
                throw new common_1.HttpException(`今日当前类型免费额度已经使用完毕、建议您注册账户体验更加完整的服务内容！`, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            else {
                await this.fingerprintLogEntity.update({ fingerprint: id }, data);
                return true;
            }
        }
    }
    isUpdatedToday(date) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date >= todayStart;
    }
    async deductFromBalance(userId, deductionType, amount, UseAmount = 0) {
        const b = await this.userBalanceEntity.findOne({ where: { userId } });
        if (!b) {
            throw new common_1.HttpException('缺失当前用户账户记录！', common_1.HttpStatus.BAD_REQUEST);
        }
        const memberKey = deductionType === 'model3'
            ? 'memberModel3Count'
            : deductionType === 'model4'
                ? 'memberModel4Count'
                : deductionType === 'mjDraw'
                    ? 'memberDrawMjCount'
                    : null;
        const baseKey = deductionType === 'model3' ? 'model3Count' : deductionType === 'model4' ? 'model4Count' : deductionType === 'mjDraw' ? 'drawMjCount' : null;
        const updateKey = b.packageId && b[memberKey] < amount ? baseKey : b.packageId ? memberKey : baseKey;
        let useKey = null;
        if (updateKey.includes('odel3')) {
            useKey = 'useModel3Token';
        }
        if (updateKey.includes('odel4')) {
            useKey = 'useModel4Token';
        }
        if (updateKey.includes('MjCount')) {
            useKey = 'useDrawMjToken';
        }
        const updateBalance = { [updateKey]: b[updateKey] - amount < 0 ? 0 : b[updateKey] - amount, [useKey]: b[useKey] + UseAmount };
        useKey === 'useModel3Token' && (updateBalance['useModel3Count'] = b['useModel3Count'] + 1);
        useKey === 'useModel4Token' && (updateBalance['useModel4Count'] = b['useModel4Count'] + 1);
        const result = await this.userBalanceEntity.update({ userId }, updateBalance);
        if (result.affected === 0) {
            throw new common_1.HttpException('消费余额失败！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async queryUserBalance(userId) {
        try {
            const res = await this.userBalanceEntity.findOne({
                where: { userId },
                select: [
                    'packageId',
                    'model3Count',
                    'model4Count',
                    'drawMjCount',
                    'memberModel3Count',
                    'memberModel4Count',
                    'memberDrawMjCount',
                    'useModel3Count',
                    'useModel4Count',
                    'useModel3Token',
                    'useModel4Token',
                    'useDrawMjToken',
                    'expirationTime',
                ],
            });
            if (!res) {
                const user = await this.createBaseUserBalance(userId);
                if (user) {
                    return await this.queryUserBalance(userId);
                }
                else {
                    throw new common_1.HttpException('查询当前用户余额失败！', common_1.HttpStatus.BAD_REQUEST);
                }
            }
            res.sumModel3Count = res.packageId ? res.model3Count + res.memberModel3Count : res.model3Count;
            res.sumModel4Count = res.packageId ? res.model4Count + res.memberModel4Count : res.model4Count;
            res.sumDrawMjCount = res.packageId ? res.drawMjCount + res.memberDrawMjCount : res.drawMjCount;
            res.expirationTime = res.expirationTime ? (0, date_1.formatDate)(res.expirationTime, 'YYYY-MM-DD') : null;
            return res;
        }
        catch (error) {
            console.log('error: ', error);
        }
    }
    async saveRecordRechargeLog(logInfo) {
        const { userId, rechargeType, model3Count, model4Count, drawMjCount, days = -1, pkgName = '', extent = '' } = logInfo;
        if (!userId) {
            throw new common_1.HttpException('当前用户不存在,记录充值日志异常', common_1.HttpStatus.BAD_REQUEST);
        }
        const uid = (0, utils_1.createRandomUid)();
        return await this.accountLogEntity.save({ userId, rechargeType, model3Count, model4Count, drawMjCount, days, extent, uid, pkgName });
    }
    async createBaseUserBalance(userId, userBalanceInfo = {}) {
        const { model3Count = 0, model4Count = 0, drawMjCount = 0 } = userBalanceInfo;
        const balance = await this.userBalanceEntity.findOne({ where: { userId } });
        if (balance) {
            throw new common_1.HttpException('当前用户无需创建账户信息！', common_1.HttpStatus.BAD_REQUEST);
        }
        return await this.userBalanceEntity.save({ userId, model3Count, model4Count, drawMjCount });
    }
    async addBalanceToUser(userId, balance, days = -1) {
        try {
            const userBalanceInfo = (await this.userBalanceEntity.findOne({ where: { userId } })) || (await this.createBaseUserBalance(userId));
            if (!userBalanceInfo) {
                throw new common_1.HttpException('查询用户账户信息失败！', common_1.HttpStatus.BAD_REQUEST);
            }
            const { model3Count, model4Count, drawMjCount, memberModel3Count, memberModel4Count, memberDrawMjCount } = userBalanceInfo;
            let params = {};
            if (days > 0) {
                const { packageId } = balance;
                if (!packageId) {
                    throw new common_1.HttpException('缺失当前套餐ID、充值失败！', common_1.HttpStatus.BAD_REQUEST);
                }
                const pkgInfo = await this.cramiPackageEntity.findOne({ where: { id: packageId } });
                if (!pkgInfo) {
                    throw new common_1.HttpException('当前套餐不存在！', common_1.HttpStatus.BAD_REQUEST);
                }
                const { weight } = pkgInfo;
                if (!userBalanceInfo.packageId) {
                    params = {
                        memberModel3Count: model3Count + balance.model3Count,
                        memberModel4Count: model4Count + balance.model4Count,
                        memberDrawMjCount: drawMjCount + balance.drawMjCount,
                        expirationTime: (0, date_1.default)()
                            .add(days > 0 ? days : 0, 'day')
                            .format('YYYY-MM-DD HH:mm:ss'),
                        packageId: packageId,
                    };
                }
                else {
                    const curPackageInfo = await this.cramiPackageEntity.findOne({ where: { id: userBalanceInfo.packageId } });
                    if (weight >= curPackageInfo.weight) {
                        params = {
                            memberModel3Count: memberModel3Count + balance.model3Count,
                            memberModel4Count: memberModel4Count + balance.model4Count,
                            memberDrawMjCount: memberDrawMjCount + balance.drawMjCount,
                            expirationTime: (0, date_1.default)(userBalanceInfo.expirationTime)
                                .add(days > 0 ? days : 0, 'day')
                                .format('YYYY-MM-DD HH:mm:ss'),
                            packageId: packageId,
                        };
                    }
                    if (weight < curPackageInfo.weight) {
                        params = {
                            memberModel3Count: memberModel3Count + balance.model3Count,
                            memberModel4Count: memberModel4Count + balance.model4Count,
                            memberDrawMjCount: memberDrawMjCount + balance.drawMjCount,
                        };
                    }
                }
            }
            if (days <= 0) {
                params = {
                    model3Count: model3Count + balance.model3Count,
                    model4Count: model4Count + balance.model4Count,
                    drawMjCount: drawMjCount + balance.drawMjCount,
                };
            }
            const result = await this.userBalanceEntity.update({ userId }, params);
            if (result.affected === 0) {
                throw new common_1.HttpException(`${userId}充值失败`, common_1.HttpStatus.BAD_REQUEST);
            }
        }
        catch (error) {
            console.log('error: ', error);
            throw new common_1.HttpException('用户充值失败！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async addBalanceToOrder(order) {
        console.log('充值的工单信息:', order);
        try {
            const { userId, goodsId } = order;
            const pkg = await this.cramiPackageEntity.findOne({ where: { id: order.goodsId, status: 1 } });
            if (!pkg) {
                throw new common_1.HttpException('非法操作、当前充值套餐暂不存在！', common_1.HttpStatus.BAD_REQUEST);
            }
            const { model3Count, model4Count, drawMjCount, days, name: pkgName } = pkg;
            const money = {
                model3Count,
                model4Count,
                drawMjCount,
                days,
                packageId: order.goodsId,
            };
            await this.addBalanceToUser(userId, money, days);
            await this.saveRecordRechargeLog({ userId, rechargeType: balance_constant_1.RechargeType.SCAN_PAY, model3Count, model4Count, drawMjCount, pkgName, days });
            const userInfo = await this.userEntity.findOne({ where: { id: userId } });
            const { invitedBy } = userInfo;
            if (invitedBy) {
                const inviteUserInfo = await this.userEntity.findOne({ where: { inviteCode: invitedBy } });
                const inviteUserSalesInfo = await this.salesUsersEntity.findOne({ where: { userId: inviteUserInfo.id } });
                if (!inviteUserInfo)
                    return;
                const { id: inviterUserId } = inviteUserInfo;
                const { performanceRatio } = inviteUserSalesInfo;
                const recordsInfo = {
                    inviterUserId,
                    inviteeUserId: userId,
                    orderId: order.id,
                    orderPrice: order.total,
                    commissionPercentage: performanceRatio,
                    commissionAmount: ((order.total * performanceRatio) / 100).toFixed(2),
                };
                await this.salesService.createSalesRecords(recordsInfo);
                await this.salesService.saveCommissionAmount(inviterUserId, recordsInfo.commissionAmount);
            }
        }
        catch (error) {
            console.log('error: ', error);
            throw new common_1.HttpException('充值失败！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getRechargeLog(req, params) {
        const { page = 1, size = 20 } = params;
        const { id } = req.user;
        const [rows, count] = await this.accountLogEntity.findAndCount({
            where: { userId: id },
            order: { id: 'DESC' },
            skip: (page - 1) * size,
            take: size,
        });
        rows.forEach((item) => {
            item.expireDateCn = item.days > 0 ? `${item.days}天` : '永久';
        });
        return { rows: (0, date_1.formatCreateOrUpdateDate)(rows), count };
    }
    async getAccountLog(req, params) {
        try {
            const { page = 1, size = 10, userId, rechargeType, packageId } = params;
            const { role } = req.user;
            const where = {};
            rechargeType && (where.rechargeType = rechargeType);
            where.userId = userId || (0, typeorm_2.LessThan)(100000);
            packageId && (where.packageId = { $like: `%${packageId}%` });
            const [rows, count] = await this.accountLogEntity.findAndCount({
                where,
                order: { id: 'DESC' },
                skip: (page - 1) * size,
                take: size,
            });
            const userIds = rows.map((item) => item.userId);
            const userInfo = await this.userEntity.find({ where: { id: (0, typeorm_2.In)(userIds) } });
            rows.forEach((item) => {
                const user = userInfo.find((user) => user.id === item.userId);
                item.username = user === null || user === void 0 ? void 0 : user.username;
                item.email = user === null || user === void 0 ? void 0 : user.email;
                item.phone = user === null || user === void 0 ? void 0 : user.phone;
                item.status = user === null || user === void 0 ? void 0 : user.status;
                item.avatar = user === null || user === void 0 ? void 0 : user.avatar;
            });
            if (role !== 'super') {
                rows.forEach((item) => {
                    item.email = item.email ? (0, utils_1.hideString)(item.email) : '';
                    item.phone = item.phone ? (0, utils_1.hideString)(item.phone) : '';
                });
            }
            return { rows, count };
        }
        catch (error) {
            console.log('error: ', error);
            throw new common_1.HttpException('查询用户账户失败！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async queryUserBalanceByIds(ids) {
        return await this.userBalanceEntity.find({ where: { userId: (0, typeorm_2.In)(ids) } });
    }
    async refundMjBalance(userId, amount) {
        await this.addBalanceToUser(userId, {
            model3Count: 0,
            model4Count: 0,
            drawMjCount: amount
        });
        await this.saveRecordRechargeLog({
            userId: userId,
            rechargeType: balance_constant_1.RechargeType.DRAW_FAIL_REFUND,
            model3Count: 0,
            model4Count: 0,
            drawMjCount: amount
        });
        common_1.Logger.debug(`User ${userId} draw failure refund ------> ${amount}`, "BalanceService");
    }
    async upgradeBalance() {
        const users = await this.userEntity.find();
        if (!users.length)
            return;
        const upgradeStatus = await this.globalConfigService.getConfigs(['upgradeStatus']);
        if (!upgradeStatus) {
            await this.globalConfigService.setConfig({ settings: [{ configKey: 'upgradeStatus', configVal: '1' }] });
        }
        else {
            throw new common_1.HttpException('您已经升级过了、请勿重复操作！', common_1.HttpStatus.BAD_REQUEST);
        }
        users.forEach((user) => {
            const { id } = user;
            this.balanceEntity.findOne({ where: { userId: id } }).then((res) => {
                if (!res)
                    return;
                this.writeOldBalanceToNewTable(id, res);
            });
        });
    }
    async writeOldBalanceToNewTable(userId, balanceInfo) {
        const { balance = 0, usesLeft = 0, paintCount = 0, useTokens = 0, useChats = 0, usePaints = 0 } = balanceInfo;
        const model4Info = await this.whiteListEntity.findOne({ where: { userId } });
        const newBalanceInfo = {
            userId,
            model3Count: Number(usesLeft),
            model4Count: (model4Info === null || model4Info === void 0 ? void 0 : model4Info.count) || 0,
            drawMjCount: Number(balance),
            useModel3Count: Number(useChats),
            useModel4Count: (model4Info === null || model4Info === void 0 ? void 0 : model4Info.useCount) || 0,
            useDrawMjCount: Number(usePaints),
            useModel3Token: Number(useTokens),
            useModel4Token: 0,
            useDrawMjToken: 0,
        };
        const userBalanceInfo = await this.userBalanceEntity.findOne({ where: { userId } });
        if (userBalanceInfo) {
            common_1.Logger.debug(`用户${userId}账户信息已经存在、迁移无效`, 'BalanceService');
        }
        else {
            this.userBalanceEntity
                .save(newBalanceInfo)
                .then((res) => {
                common_1.Logger.debug(`用户${userId}旧账户信息迁移成功`, 'BalanceService');
            })
                .catch((error) => {
                console.log('error: ', error);
                common_1.Logger.debug(`用户${userId}旧账户信息迁移失败`, 'BalanceService');
            });
        }
    }
    async inheritVisitorData(req) {
        const { fingerprint } = req.headers;
        const { id: userId } = req.user;
        await this.chatLogEntity.update({ userId: Number(fingerprint) }, { userId });
        await this.chatGroupEntity.update({ userId: Number(fingerprint) }, { userId });
        await this.midjourneyEntity.update({ userId: Number(fingerprint) }, { userId });
        return 1;
    }
    async getVisitorCount(req) {
        const { fingerprint } = req.headers;
        const countChat = await this.chatLogEntity.count({ where: { userId: fingerprint } });
        const countChatGroup = await this.chatGroupEntity.count({ where: { userId: fingerprint } });
        const countMj = await this.midjourneyEntity.count({ where: { userId: fingerprint } });
        return countChat || countChatGroup || countMj || 0;
    }
};
UserBalanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(balance_entity_1.BalanceEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(userBalance_entity_1.UserBalanceEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(accountLog_entity_1.AccountLogEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(cramiPackage_entity_1.CramiPackageEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(config_entity_1.ConfigEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(salesUsers_entity_1.SalesUsersEntity)),
    __param(7, (0, typeorm_1.InjectRepository)(whiteList_entity_1.WhiteListEntity)),
    __param(8, (0, typeorm_1.InjectRepository)(fingerprint_entity_1.FingerprintLogEntity)),
    __param(9, (0, typeorm_1.InjectRepository)(chatGroup_entity_1.ChatGroupEntity)),
    __param(10, (0, typeorm_1.InjectRepository)(chatLog_entity_1.ChatLogEntity)),
    __param(11, (0, typeorm_1.InjectRepository)(midjourney_entity_1.MidjourneyEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        sales_service_1.SalesService,
        globalConfig_service_1.GlobalConfigService])
], UserBalanceService);
exports.UserBalanceService = UserBalanceService;
