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
exports.OfficialService = void 0;
const chatgpt_service_1 = require("./../chatgpt/chatgpt.service");
const globalConfig_service_1 = require("./../globalConfig/globalConfig.service");
const auth_service_1 = require("./../auth/auth.service");
const user_service_1 = require("./../user/user.service");
const autoreply_service_1 = require("./../autoreply/autoreply.service");
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const axios_1 = require("axios");
const utils_1 = require("../../common/utils");
let OfficialService = class OfficialService {
    constructor(autoreplyService, userService, authService, globalConfigService, chatgptService) {
        this.autoreplyService = autoreplyService;
        this.userService = userService;
        this.authService = authService;
        this.globalConfigService = globalConfigService;
        this.chatgptService = chatgptService;
        this.sceneStrMap = {};
        this.scanedSceneStrMap = {};
    }
    async onModuleInit() {
        await this.globalConfigService.getWechatAccessToken(true);
    }
    async getQRSceneStr(body) {
        const { invitedBy } = body;
        let sceneStr = (0, utils_1.createRandomNonceStr)(32);
        invitedBy && (sceneStr += `:${invitedBy}`);
        this.sceneStrMap[sceneStr] = true;
        return sceneStr;
    }
    async getQRSceneStrByBind(req) {
        const { id } = req.user;
        const sceneStr = `${(0, utils_1.createRandomNonceStr)(32)}/${id}`;
        this.sceneStrMap[sceneStr] = true;
        return sceneStr;
    }
    async getQRCodeTicket(sceneStr) {
        return this.fetchQRCodeTicket(sceneStr);
    }
    async getRedirectUrl(url) {
        const appId = await this.globalConfigService.getConfigs(['wechatOfficialAppId']);
        const res = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodeURIComponent(url)}&response_type=code&scope=snsapi_base&state=weChatLogin#wechat_redirect`;
        console.log('回跳跳转地址: ', res);
        return res;
    }
    async getJsapiTicket(url) {
        const nonceStr = (0, utils_1.createRandomNonceStr)(32);
        const timestamp = (Date.now() / 1000).toFixed(0);
        const jsapiTicket = await this.globalConfigService.getConfigs(['wechatJsapiTicket']);
        console.log('jsapiTicket: ', jsapiTicket);
        const appId = await this.globalConfigService.getConfigs(['wechatOfficialAppId']);
        console.log('appId: ', appId);
        const str = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
        console.log('str: ', str);
        const signature = this.sha1(str);
        return { appId, nonceStr, timestamp, signature };
    }
    async fetchQRCodeTicket(sceneStr) {
        const accessToken = await this.globalConfigService.getConfigs(['wechatAccessToken']);
        const params = { action_name: 'QR_STR_SCENE', action_info: { scene: { scene_str: sceneStr } } };
        const res = await axios_1.default.post(`https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`, params);
        const { data: { errmsg, ticket }, } = res;
        if (errmsg)
            throw new common_1.HttpException(errmsg, common_1.HttpStatus.BAD_REQUEST);
        return ticket;
    }
    async loginByCode(req, code) {
        const appId = await this.globalConfigService.getConfigs(['wechatOfficialAppId']);
        const secret = await this.globalConfigService.getConfigs(['wechatOfficialAppSecret']);
        const res = await axios_1.default.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`);
        const { data: { errmsg, openid }, } = res;
        if (errmsg)
            throw new common_1.HttpException(errmsg, common_1.HttpStatus.BAD_REQUEST);
        let user;
        user = await this.userService.getUserOpenId(openid);
        if (!user) {
            user = await this.userService.getUserFromOpenId(openid);
        }
        return this.authService.loginByOpenId(user, req);
    }
    async scan(openID, sceneStr) {
        if (!this.sceneStrMap[sceneStr])
            throw new common_1.HttpException('非法参数', common_1.HttpStatus.BAD_REQUEST);
        const user = await this.userService.getUserFromOpenId(openID, sceneStr);
        this.scanedSceneStrMap[sceneStr] = user.id;
    }
    async loginBySceneStr(req, sceneStr) {
        if (!this.sceneStrMap[sceneStr])
            return;
        const userId = this.scanedSceneStrMap[sceneStr];
        if (!userId)
            return '';
        const user = await this.userService.getUserById(userId);
        delete this.scanedSceneStrMap[sceneStr];
        return this.authService.loginByOpenId(user, req);
    }
    async scanBindWx(openId, sceneStr) {
        if (!this.sceneStrMap[sceneStr])
            throw new common_1.HttpException('非法参数', common_1.HttpStatus.BAD_REQUEST);
        const userId = sceneStr.split('/')[1];
        const bindRes = await this.userService.bindWx(openId, userId);
        this.scanedSceneStrMap[sceneStr] = bindRes;
    }
    async bindWxBySceneStr(req, sceneStr) {
        if (!this.sceneStrMap[sceneStr])
            throw new common_1.HttpException('非法参数', common_1.HttpStatus.BAD_REQUEST);
        const { id } = req.user;
        const res = this.scanedSceneStrMap[sceneStr];
        if (!res)
            return '';
        delete this.scanedSceneStrMap[sceneStr];
        return res;
    }
    async verify(signature, nonce, timestamp) {
        const token = (await this.globalConfigService.getConfigs(['wechatOfficialToken'])) || 'jiangly';
        return (await this.sha1([token, nonce, timestamp].sort().join(''))) == signature;
    }
    sha1(data) {
        return crypto.createHash('sha1').update(data).digest('hex');
    }
    async genXmlMsgByConfig(xmlData, msgKey) {
        const msg = await this.globalConfigService.getConfigs([msgKey]);
        return this.genXmlMsg(xmlData, msg);
    }
    async genXmlMsg(xmlData, msg) {
        return `
    <xml>
        <ToUserName><![CDATA[${xmlData.fromusername[0]}]]></ToUserName>
        <FromUserName><![CDATA[${xmlData.tousername[0]}]]></FromUserName>
        <CreateTime>${new Date().getTime()}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[${msg}]]></Content>
    </xml>`;
    }
    async aotoPlay(msg) {
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('请求超时'));
            }, 4800);
        });
        let question = '';
        try {
            console.log('来自公众号的询问问题 =======> ', msg);
            const response = await Promise.race([this.chatgptService.chatSyncFree(msg), timeoutPromise]);
            question = response || await this.autoreplyService.checkAutoReply(msg);
        }
        catch (error) {
            console.log('来自公众号的回复问题 =======> 超时导致问题无法回答完整');
            question = (await this.globalConfigService.getConfigs(['officialAutoReplyText'])) || '由于公众号的回复限制、过长的问题我们可能无法回复、您可以前往我们的官方站点享受更加完善的服务、如果您有更多问题、欢迎像我提问！';
        }
        return question;
    }
};
OfficialService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [autoreply_service_1.AutoreplyService,
        user_service_1.UserService,
        auth_service_1.AuthService,
        globalConfig_service_1.GlobalConfigService,
        chatgpt_service_1.ChatgptService])
], OfficialService);
exports.OfficialService = OfficialService;
