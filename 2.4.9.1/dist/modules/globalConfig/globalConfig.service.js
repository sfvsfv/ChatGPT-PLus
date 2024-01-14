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
exports.GlobalConfigService = void 0;
const models_service_1 = require("./../models/models.service");
const chatLog_entity_1 = require("./../chatLog/chatLog.entity");
const common_1 = require("@nestjs/common");
const config_entity_1 = require("./config.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const utils_1 = require("../../common/utils");
const axios_1 = require("axios");
const fs = require("fs");
const packageJsonContent = fs.readFileSync('package.json', 'utf-8');
const packageJson = JSON.parse(packageJsonContent);
const version = packageJson.version;
console.log(' current use version in ------>: ', version);
let GlobalConfigService = class GlobalConfigService {
    constructor(configEntity, chatLogEntity, modelsService) {
        this.configEntity = configEntity;
        this.chatLogEntity = chatLogEntity;
        this.modelsService = modelsService;
        this.globalConfigs = {};
        this.nineAiToken = true;
    }
    async onModuleInit() {
        await this.initGetAllConfig();
    }
    async getConfigs(configKey) {
        if (configKey.length === 0)
            return;
        if (configKey.includes('wechatAccessToken') && configKey.length === 1) {
            return this.wechatAccessToken;
        }
        if (configKey.includes('wechatJsapiTicket') && configKey.length === 1) {
            return this.wechatJsapiTicket;
        }
        if (configKey.length === 1) {
            return this.globalConfigs[configKey[0]];
        }
        else {
            const result = {};
            configKey.forEach((key) => (result[key] = this.globalConfigs[key]));
            return result;
        }
    }
    async initGetAllConfig() {
        const data = await this.configEntity.find();
        this.globalConfigs = data.reduce((prev, cur) => {
            prev[cur.configKey] = cur.configVal;
            return prev;
        }, {});
        this.initBaiduSensitive();
    }
    async initBaiduSensitive(isInit = true) {
        const { baiduTextApiKey, baiduTextSecretKey } = await this.getConfigs(['baiduTextApiKey', 'baiduTextSecretKey']);
        if (!baiduTextApiKey || !baiduTextSecretKey) {
            common_1.Logger.error('百度敏感词初始化失败，如果需要敏感检测、请前往后台系统配置!', 'GlobalConfigService');
            return;
        }
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        const url = `https://aip.baidubce.com/oauth/2.0/token?client_id=${baiduTextApiKey}&client_secret=${baiduTextSecretKey}&grant_type=client_credentials`;
        try {
            const response = await axios_1.default.post(url, { headers });
            this.globalConfigs.baiduTextAccessToken = response.data.access_token;
        }
        catch (error) {
            if (isInit) {
                common_1.Logger.error('百度敏感词配置检测失败，您的参数可能配置的不正确!', 'GlobalConfigService');
            }
            else {
                throw new common_1.HttpException(error.response.data.error_description, common_1.HttpStatus.BAD_REQUEST);
            }
        }
    }
    async getWechatAccessToken(isInit = false) {
        const { wechatOfficialAppId: appId, wechatOfficialAppSecret: secret } = await this.getConfigs(['wechatOfficialAppId', 'wechatOfficialAppSecret']);
        if (!appId || !secret) {
            return common_1.Logger.error('还未配置微信的appId和secret、配置后才可进行微信扫码登录！！！', 'OfficialService');
        }
        this.wechatAccessToken = await this.fetchBaseAccessToken(appId, secret, isInit);
        this.wechatJsapiTicket = await this.fetchJsapiTicket(this.wechatAccessToken);
        common_1.Logger.log(`wechat refresh access_token  ==> ${this.wechatAccessToken}`, 'OfficialService');
    }
    async fetchBaseAccessToken(appId, secret, isInit = false) {
        if (process.env.ISDEV === 'TRUE') {
            this.wechatAccessToken = '';
            return;
        }
        const { data: { errmsg, access_token }, } = await axios_1.default.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`);
        if (errmsg) {
            if (isInit) {
                common_1.Logger.error(`获取微信access_token失败、错误信息：${errmsg}`, 'OfficialService');
            }
            else {
                throw new common_1.HttpException('请配置正确的秘钥、当前秘钥检测不通过！', common_1.HttpStatus.BAD_REQUEST);
            }
            return '';
        }
        return access_token;
    }
    async fetchJsapiTicket(accessToken) {
        var _a;
        if (process.env.ISDEV === 'TRUE') {
            this.wechatJsapiTicket = '';
            return;
        }
        const res = await axios_1.default.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`);
        return (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.ticket;
    }
    async queryAllConfig(req) {
        const { role } = req.user;
        return this.globalConfigs;
    }
    async queryFrontConfig(query, req) {
        const allowKeys = [
            'vxNumber',
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
            'invitedGuestSendModel4Count',
            'invitedGuestSendDrawMjCount',
            'clientHomePath',
            'clientLogoPath',
            'clientFavoIconPath',
            'isUseWxLogin',
            'siteName',
            'robotAvatar',
            'siteRobotName',
            'buyCramiAddress',
            'mindDefaultData',
            'baiduCode',
            'payEpayChannel',
            'payMpayChannel',
            'payEpayApiPayUrl',
            'payEpayStatus',
            'payHupiStatus',
            'payWechatStatus',
            'payMpayStatus',
            'isAutoOpenNotice',
            'isShowAppCatIcon',
            'salesBaseRatio',
            'salesSeniorRatio',
            'salesAllowDrawMoney',
            'companyName',
            'filingNumber',
            'phoneRegisterStatus',
            'emailRegisterStatus',
            'emailLoginStatus',
            'phoneLoginStatus',
            'wechatRegisterStatus',
            'wechatSilentLoginStatus',
            'signInStatus',
            'signInModel3Count',
            'signInModel4Count',
            'signInMjDrawToken',
            'appMenuHeaderTips',
            'appMenuHeaderBgUrl',
            'mjUseBaiduFy',
            'mjHideNotBlock',
            'mjHideWorkIn',
            'isVerifyEmail',
        ];
        const data = await this.configEntity.find({ where: { configKey: (0, typeorm_2.In)(allowKeys) } });
        const { domain } = query;
        const domainDb = this.globalConfigs['domain'];
        if (domainDb !== domain) {
            this.createOrUpdate({ configKey: `domain`, configVal: domain, status: 1 });
            await this.initGetAllConfig();
        }
        const publicConfig = data.reduce((prev, cur) => {
            prev[cur.configKey] = cur.configVal;
            return prev;
        }, {});
        const { wechatOfficialAppId, wechatOfficialAppSecret } = await this.getConfigs(['wechatOfficialAppId', 'wechatOfficialAppSecret']);
        const isUseWxLogin = !!(wechatOfficialAppId && wechatOfficialAppSecret);
        return Object.assign(Object.assign({}, publicConfig), { isUseWxLogin });
    }
    async queryGptKeys(req) {
        const { role } = req.user;
        const data = await this.configEntity.find({ where: { configKey: (0, typeorm_2.Like)(`%${'chatGptKey'}%`) } });
        if (role === 'super')
            return data;
        return data.map((t) => {
            t.configVal = (0, utils_1.hideString)(t.configVal);
            return t;
        });
    }
    async setGptKeys(body) {
        const effectiveConfig = body.configs.filter((t) => t.configVal);
        const keys = effectiveConfig.map((t) => t.configKey);
        for (const [index, value] of effectiveConfig.entries()) {
            const { configKey, configVal, status } = value;
            await this.createOrUpdate({ configKey: `chatGptKey:${index + 1}`, configVal, status });
        }
        const likeChatGptKeys = await this.configEntity.find({ where: { configKey: (0, typeorm_2.Like)(`%${'chatGptKey'}%`) } });
        const allKey = likeChatGptKeys.map((t) => t.configKey);
        if (allKey.length > keys.length) {
            const diffKey = (0, utils_1.getDiffArray)(allKey.length, keys.length, 'chatGptKey:');
            for (const key of diffKey) {
                await this.configEntity.delete({ configKey: key });
            }
        }
        await this.initGetAllConfig();
        return '操作完成！';
    }
    async queryConfig(body, req) {
        const { role } = req.user;
        const { keys } = body;
        const data = await this.configEntity.find({ where: { configKey: (0, typeorm_2.In)(keys) } });
        if (role !== 'super') {
            data.forEach((item) => {
                if (item.configKey.includes('mj') ||
                    item.configKey.includes('Key') ||
                    item.configKey.includes('gpt') ||
                    item.configKey.includes('cos') ||
                    item.configKey.includes('baidu') ||
                    item.configKey.includes('ali') ||
                    item.configKey.includes('tencent') ||
                    item.configKey.includes('pay') ||
                    item.configKey.includes('wechat') ||
                    item.configKey.includes('mjProxyImgUrl') ||
                    item.configKey === 'openaiBaseUrl') {
                    const longKeys = ['payWeChatPublicKey', 'payWeChatPrivateKey'];
                    if (longKeys.includes(item.configKey)) {
                        return (item.configVal = (0, utils_1.hideString)(item.configVal, '隐私内容、非超级管理员无权查看'));
                    }
                    const whiteListKey = ['payEpayStatus', 'payHupiStatus', 'mjProxy'];
                    if (!whiteListKey.includes(item.configKey) && !item.configKey.includes('Status')) {
                        item.configVal = (0, utils_1.hideString)(item.configVal);
                    }
                }
            });
        }
        return data.reduce((prev, cur) => {
            prev[cur.configKey] = cur.configVal;
            return prev;
        }, {});
    }
    getNineAiToken() {
        const MjdrawCount = this.globalConfigs['MjdrawCount'];
        const auth = this.nineAiToken;
        return !auth || Number(MjdrawCount) === 1;
    }
    async setConfig(body) {
        try {
            const { settings } = body;
            for (const item of settings) {
                await this.createOrUpdate(item);
            }
            await this.initGetAllConfig();
            const keys = settings.map((t) => t.configKey);
            if (keys.includes('baiduTextApiKey') || keys.includes('baiduTextSecretKey')) {
                await this.initBaiduSensitive(false);
            }
            if (keys.includes('wechatOfficialAppId') || keys.includes('wechatOfficialAppSecret')) {
                await this.getWechatAccessToken();
            }
            return '设置完成！';
        }
        catch (error) {
            console.log('error: ', error);
        }
    }
    async createOrUpdate(setting) {
        try {
            const { configKey, configVal, status = 1 } = setting;
            const c = await this.configEntity.findOne({ where: { configKey } });
            if (c) {
                const res = await this.configEntity.update({ configKey }, { configVal, status });
            }
            else {
                const save = await this.configEntity.save({ configKey, configVal, status });
            }
        }
        catch (error) {
            console.log('error: ', error);
            throw new common_1.HttpException('设置配置信息错误！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async queryNotice() {
        return await this.getConfigs(['noticeInfo', 'noticeTitle']);
    }
    async getCopyright() {
        return await this.getConfigs(['copyrightUrl', 'copyrightTitle']);
    }
    async queryPayType() {
        const { payHupiStatus = 0, payEpayStatus = 0, payWechatStatus = 0, payMpayStatus = 0, } = await this.getConfigs(['payHupiStatus', 'payEpayStatus', 'payMpayStatus', 'payWechatStatus']);
        if ([payHupiStatus, payEpayStatus, payWechatStatus, payMpayStatus].every((status) => status === 0)) {
            throw new common_1.HttpException('支付功能暂未开放!', common_1.HttpStatus.BAD_REQUEST);
        }
        if (Number(payWechatStatus) === 1) {
            return 'wechat';
        }
        if (Number(payEpayStatus) === 1) {
            return 'epay';
        }
        if (Number(payMpayStatus) === 1) {
            return 'mpay';
        }
        if (Number(payHupiStatus) === 1) {
            return 'hupi';
        }
    }
    async getAuthInfo() {
        const { siteName, qqNumber, vxNumber, registerBaseUrl, domain } = await this.getConfigs([
            'siteName',
            'qqNumber',
            'vxNumber',
            'registerBaseUrl',
            'domain',
        ]);
        return { siteName, qqNumber, vxNumber, registerBaseUrl, domain };
    }
    async getPhoneVerifyConfig() {
        const { phoneRegisterStatus, aliPhoneAccessKeyId, aliPhoneAccessKeySecret, aliPhoneSignName, aliPhoneTemplateCode } = await this.getConfigs([
            'phoneRegisterStatus',
            'aliPhoneAccessKeyId',
            'aliPhoneAccessKeySecret',
            'aliPhoneSignName',
            'aliPhoneTemplateCode',
        ]);
        if (Number(phoneRegisterStatus) !== 1) {
            throw new common_1.HttpException('手机验证码功能暂未开放!', common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            accessKeyId: aliPhoneAccessKeyId,
            accessKeySecret: aliPhoneAccessKeySecret,
            SignName: aliPhoneSignName,
            TemplateCode: aliPhoneTemplateCode,
        };
    }
    getNamespace() {
        return process.env.NAMESPACE || 'NINEAI';
    }
    async getSignatureGiftConfig() {
        const { signInStatus = 0, signInModel3Count = 0, signInModel4Count = 0, signInMjDrawToken = 0, } = await this.getConfigs(['signInStatus', 'signInModel3Count', 'signInModel4Count', 'signInMjDrawToken']);
        if (Number(signInStatus) !== 1) {
            throw new common_1.HttpException('签到功能暂未开放!', common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            model3Count: Number(signInModel3Count),
            model4Count: Number(signInModel4Count),
            drawMjCount: Number(signInMjDrawToken),
        };
    }
    async getSensitiveConfig() {
        const { baiduTextStatus = 0, baiduTextAccessToken, nineaiBuiltInSensitiveStatus = 0, nineaiBuiltInSensitiveApiBase, nineaiBuiltInSensitiveAuthKey, } = await this.getConfigs([
            'baiduTextStatus',
            'baiduTextAccessToken',
            'nineaiBuiltInSensitiveStatus',
            'nineaiBuiltInSensitiveApiBase',
            'nineaiBuiltInSensitiveAuthKey',
        ]);
        if (Number(baiduTextStatus) === 1) {
            return {
                useType: 'baidu',
                baiduTextAccessToken,
            };
        }
        if (Number(nineaiBuiltInSensitiveStatus) === 1) {
            return {
                useType: 'nineai',
                nineaiBuiltInSensitiveApiBase,
                nineaiBuiltInSensitiveAuthKey,
            };
        }
        return null;
    }
};
GlobalConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(config_entity_1.ConfigEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(chatLog_entity_1.ChatLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        models_service_1.ModelsService])
], GlobalConfigService);
exports.GlobalConfigService = GlobalConfigService;
