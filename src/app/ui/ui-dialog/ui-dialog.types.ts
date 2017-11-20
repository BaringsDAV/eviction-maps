class DialogContentItem {
    type: string;
    data: any;
}

class DialogConfig {
    title: string;
    content: Array<DialogContentItem>;
    buttons: { ok: boolean, cancel: boolean };
}

class DialogResponse {
    accepted: boolean;
    content?: Array<DialogContentItem>;
}

export { DialogConfig, DialogContentItem, DialogResponse };
