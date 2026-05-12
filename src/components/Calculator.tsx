import { useEffect, useMemo, useState } from "react";

function calculatePace(hours: number, minutes: number, seconds: number, distance: number, paceDistance: number) {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    // prefer under-estimation than over-estimation
    let paceSeconds = Math.ceil(paceDistance / (distance / totalSeconds));
    const parts: string[] = [];

    const hoursPace = Math.floor(paceSeconds / 3600);
    if (hoursPace > 0) {
        parts.push(`${hoursPace} hour${hoursPace > 1 ? "s" : ""}`);
        paceSeconds -= hoursPace * 3600;
    }
    const minutesPace = Math.floor(paceSeconds / 60);
    if (minutesPace > 0) {
        parts.push(`${minutesPace} minute${minutesPace > 1 ? "s" : ""}`);
        paceSeconds -= minutesPace * 60;
    }
    if (paceSeconds > 0) {
        parts.push(`${paceSeconds} second${paceSeconds > 1 ? "s" : ""}`);
    }

    return parts.join(" ");
}

interface Props {
    paceData: any;
    vdotData: any;
}

export default function ({ paceData, vdotData }: Props) {
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [distance, setDistance] = useState(0);
    const [distanceLabels, setDistanceLabels] = useState<Record<string, number>>({});
    const paceKm = useMemo(() => {
        const pace = calculatePace(hours, minutes, seconds, distance, 1000);
        return `${pace} / km`;
    }, [hours, minutes, seconds, distance]);
    const paceMile = useMemo(() => {
        const pace = calculatePace(hours, minutes, seconds, distance, 1609.344);
        return `${pace} / mi`;
    }, [hours, minutes, seconds, distance]);

    const [vdotLevels, setVdotLevels] = useState<Record<string, any>>({});
    const [vdotTierDefinitions, setVdotTierDefinitions] = useState<Record<string, any>>({});
    const vdot = useMemo(() => {
        if (distance === 0) {
            return 0;
        }

        const totalMinutes = hours * 60 + minutes + seconds / 60.0;
        const velocity = distance / totalMinutes;
        const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
        const vo2MaxSustained = 0.8 + 0.1894393 * Math.exp(-0.012778 * totalMinutes) + 0.2989558 * Math.exp(-0.1932605 * totalMinutes);
        const vdot = vo2 / vo2MaxSustained;
        return vdot;
    }, [hours, minutes, seconds, distance]);
    const vdotTier = useMemo(() => {
        for (const data of Object.values(vdotLevels).toReversed()) {
            if (vdot >= data.vdot) {
                return data.tier;
            }
        }
        return "Unknown";
    }, [vdot, vdotLevels]);
    const vdotDefinition = useMemo(() => {
        console.log(vdotTier, vdotTierDefinitions);
        if (!vdotTierDefinitions) {
            return "";
        }
        return vdotTier in vdotTierDefinitions ? vdotTierDefinitions[vdotTier] : "";
    }, [vdotTier, vdotTierDefinitions]);

    useEffect(() => {
        if (paceData) {
            const labels = paceData.metadata.distanceLabels;
            setDistanceLabels(labels);
            setDistance(paceData.metadata.distances[0]);
        }
        if (vdotData) {
            setVdotLevels(vdotData.data);
            setVdotTierDefinitions(vdotData.metadata.tier_definitions);
        }
    }, [paceData, vdotData]);

    return (
        <>
            <form>
                <select value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
                    {Object.keys(distanceLabels).map((distance) => (
                        <option key={distance} value={distance}>{distanceLabels[distance]}</option>
                    ))}
                </select>
                <div>
                    <label htmlFor="hours">Hours</label>
                    <input
                        type="text"
                        id="hours"
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label htmlFor="minutes">Minutes</label>
                    <input
                        type="text"
                        id="minutes"
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label htmlFor="seconds">Seconds</label>
                    <input
                        type="text"
                        id="seconds"
                        value={seconds}
                        onChange={(e) => setSeconds(Number(e.target.value))}
                    />
                </div>
            </form>
            <p>Your pace is {paceKm}</p>
            <p>Your pace is {paceMile}</p>
            <p>Your VDOT is {vdot.toFixed(2)} with level {vdotTier}</p>
            <p>{JSON.stringify(vdotDefinition)}</p>
        </>
    );
}