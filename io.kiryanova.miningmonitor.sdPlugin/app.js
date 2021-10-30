class MiningMonitorAction {
    actionId = 'io.kiryanova.miningmonitor';
    actionName = 'MiningMonitorAction';
    
    streamDeckApi = null;
    canvas = null;
    context = null;
    logger = null;
    settings = {};

    constructor() {
        this.streamDeckApi = $SD;
        this.logger = console;

        this.streamDeckApi.on('connected', (event) => this.onConnected(event));

        this.logger.debug(`[${this.actionName}] Constructor Complete`)
    }

    onConnected(event) {
        this.logger.debug(`[${this.actionName}] onConnected 🔗`, event);

        this.streamDeckApi.on(`${this.actionId}.willAppear`, (event) => this.onWillAppear(event));
        this.streamDeckApi.on(`${this.actionId}.keyUp`, (event) => this.onKeyUp(event));
        this.streamDeckApi.on(`${this.actionId}.sendToPlugin`, (event) => this.onSendToPlugin(event));
        this.streamDeckApi.on(`${this.actionId}.didReceiveSettings`, (event) => this.onDidReceiveSettings(event));
        this.streamDeckApi.on(`${this.actionId}.propertyInspectorDidAppear`, (event) => this.onPropertyInspectorDidAppear(event));
        this.streamDeckApi.on(`${this.actionId}.propertyInspectorDidDisappear`, (event) => this.onPropertyInspectorDidDisappear(event));
    }

    onWillAppear(event) {
        this.logger.debug(`[${this.actionName}] onWillAppear ✨`, event);

        this.settings = event.payload.settings;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 144;
        this.canvas.height = 144;

        this.context = this.canvas.getContext("2d");

        this.drawLoading(event);
        this.update(event);
    }

    onKeyUp(event) {
        this.logger.debug(`[${this.actionName}] onKeyUp ⌨️`, event);

        this.update(event);
    }

    onSendToPlugin(event) {
        this.logger.debug(`[${this.actionName}] onSendToPlugin 📡`, event);
    }

    onDidReceiveSettings(event) {
        this.logger.debug(`[${this.actionName}] onDidReceiveSettings ⚙️`, event);

        this.settings = event.payload && event.payload.settings ? event.payload.settings : {};
    }

    onPropertyInspectorDidAppear(event) {
        this.logger.debug(`[${this.actionName}] onPropertyInspectorDidAppear 🔍`, event);
    }

    onPropertyInspectorDidDisappear(event) {
        this.logger.debug(`[${this.actionName}] onPropertyInspectorDidDisappear 🔍`, event);
    }

    update(event) {
        if (!this.settings.minerId || !this.settings.poolApiUrl) {
            this.logger.error(`[${this.actionName}] Missing minerId or poolApiUrl.`)
            return;
        }

        this.getStats().then(apiResponse => this.drawApiResponse(event, apiResponse));
    }

    getStats() {
        let poolApiUrl = this.settings.poolApiUrl.charAt(this.settings.poolApiUrl.length - 1) !== '/' ? 
            this.settings.poolApiUrl + '/' : 
            this.settings.poolApiUrl;

        return fetch(`${poolApiUrl}miner/${this.settings.minerId.replace('0x','')}/dashboard`)
            .then(response => response.json())
    }

    formatApiResponse(apiResponse) {
        const currentHashrateInMhs = (apiResponse.data.currentStatistics.currentHashrate * Math.pow(10,-6)).toFixed(2)
        const formattedHashrate = `${currentHashrateInMhs} MH/s`

        const unpaid = (apiResponse.data.currentStatistics.unpaid * Math.pow(10,-18)).toFixed(4)
        const formattedUnpaid = `${unpaid} ETH`

        const formattedWorkers = `${apiResponse.data.currentStatistics.activeWorkers}/${apiResponse.data.workers.length}`

        return {
            hashrate: formattedHashrate,
            unpaid: formattedUnpaid,
            workers: formattedWorkers,
        }
    }

    drawApiResponse(event, apiResponse) {
        if (apiResponse.status !== 'OK') {
            return;
        }

        const formattedResponse = this.formatApiResponse(apiResponse);

        this.clear();                

        let y = 20;
        const lineHeight = 22;

        this.setFont('heading');
        this.context.fillText('Hashrate', 10, y); 
        this.setFont('paragraph');
        this.context.fillText(formattedResponse.hashrate, 10, y += lineHeight); 

        this.setFont('heading');
        this.context.fillText('Balance', 10, y += lineHeight); 
        this.setFont('paragraph');
        this.context.fillText(formattedResponse.unpaid, 10, y += lineHeight); 

        this.setFont('heading');
        this.context.fillText('Workers', 10, y += lineHeight); 
        this.setFont('paragraph');
        this.context.fillText(formattedResponse.workers, 10, y += lineHeight); 

        this.sendCanvas(event.context)
    }

    drawLoading(event) {
        this.clear();                
        this.setFont('heading');

        this.streamDeckApi.api.clearTitle(event.context)

        this.context.textAlign = 'center';
        this.context.fillText('Loading...', 10, 62); 

        this.sendCanvas(event.context);
    }

    sendCanvas(eventContext) {
        this.streamDeckApi.api.setImage(
            eventContext,
            this.canvas.toDataURL()
        );
    }

    setFont(style) {
        switch (style) {
            case 'heading':
                this.context.textAlign = 'left';
                this.context.font = "700 20px Lato";
                this.context.fillStyle = "#AAAAAA";
                break;

            case 'paragraph':
            default:
                this.context.textAlign = 'left';
                this.context.font = "400 20px Lato";
                this.context.fillStyle = "#FFFFFF";
                break;
        }
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

const poolMonitor = new MiningMonitorAction();