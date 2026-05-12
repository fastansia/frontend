const PACE_DATA_URL = "https://fastansia.azurewebsites.net/api/data/pace";
const VDOT_DATA_URL = "https://fastansia.azurewebsites.net/api/data/vdot";

async function getJsonData(url: string): Promise<any> {
    const res = await fetch(url);
    return res.json();
}

export async function getRunningData() {
    const paceData = await getJsonData(PACE_DATA_URL);
    const vdotData = await getJsonData(VDOT_DATA_URL);
    return { paceData, vdotData };
}