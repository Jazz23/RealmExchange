// Receives the token from the client and stores it in the database

export const actions = {
    tryGetVerificationLink: async ({ platform }) => {
        const emailWorker = platform!.env.EMAIL_STORE as any;

        const resp = await emailWorker.popLink();
        if (resp.status === 200) {
            const link = await resp.text();
            return { link };
        }
        
        return { link: null };
    }
}