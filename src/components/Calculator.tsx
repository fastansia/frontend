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
    const [gender, setGender] = useState<'male' | 'female' | null>(null);
    const [age, setAge] = useState(0);

    const paceKm = useMemo(() => {
        const pace = calculatePace(hours, minutes, seconds, distance, 1000);
        return pace ? `${pace} / km` : null;
    }, [hours, minutes, seconds, distance]);
    const paceMile = useMemo(() => {
        const pace = calculatePace(hours, minutes, seconds, distance, 1609.344);
        return pace ? `${pace} / mi` : null;
    }, [hours, minutes, seconds, distance]);
    const paceClassification = useMemo(() => {
        if (gender === null || age === 0) {
            return null;
        }
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        if (totalSeconds === 0) {
            return null;
        }

        const genderString = paceData.metadata.genders[gender];
        const data = paceData.data[distance][genderString];
        for (const [ageRange, ageRangeData] of Object.entries(data)) {
            const [minAge, maxAge] = ageRange.split("-").map(Number);
            if (age < minAge || age > maxAge) {
                continue;
            }

            const classifications = Object.keys(ageRangeData as any);
            for (const [classification, pace] of Object.entries(ageRangeData as any).toReversed()) {
                // pace is either mm:ss or hh:mm:ss, so we need to convert it to seconds
                const paceParts = (pace as string).split(":").map(Number);
                let paceSeconds = 0;
                if (paceParts.length === 2) {
                    paceSeconds = paceParts[0] * 60 + paceParts[1];
                } else if (paceParts.length === 3) {
                    paceSeconds = paceParts[0] * 3600 + paceParts[1] * 60 + paceParts[2];
                }

                if (totalSeconds <= paceSeconds || classification === classifications[0]) {
                    return classification;
                }
            }
        }
        return null;
    }, [gender, age, hours, minutes, seconds, distance, paceData]);

    const [vdotLevels, setVdotLevels] = useState<Record<string, any>>({});
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

    useEffect(() => {
        if (paceData) {
            setDistance(paceData.metadata.distances[0]);
        }
        if (vdotData) {
            setVdotLevels(vdotData.data);
        }
    }, [paceData, vdotData]);

    return (
        <>
            <form className="grid gap-4 bangers-regular text-xl">
                <select
                    className="w-full border-b border-gray-700"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                >
                    {Object.keys(paceData.metadata.distanceLabels).map((distance) => (
                        <option key={distance} value={distance}>{paceData.metadata.distanceLabels[distance]}</option>
                    ))}
                </select>
                <div className="grid grid-cols-3 gap-4 time-input-div">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="hours">Hours</label>
                        <input
                            type="text"
                            id="hours"
                            className="border-b border-gray-700"
                            value={hours}
                            onChange={(e) => setHours(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="minutes">Minutes</label>
                        <input
                            type="text"
                            id="minutes"
                            className="border-b border-gray-700"
                            value={minutes}
                            onChange={(e) => setMinutes(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="seconds">Seconds</label>
                        <input
                            type="text"
                            id="seconds"
                            className="border-b border-gray-700"
                            value={seconds}
                            onChange={(e) => setSeconds(Number(e.target.value))}
                        />
                    </div>
                </div>
            </form>
            <h4 className="text-2xl text-gray-500 bangers-regular">Optional Fields (For Pace Classification)</h4>
            <div className="bangers-regular text-xl flex flex-row">
                <p>Gender: </p>
                <select
                    className="w-full border-b border-gray-700"
                    value={gender ?? ""}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                            setGender(null);
                        } else {
                            setGender(v as 'male' | 'female');
                        }
                    }}
                >
                    <option value="">Do not use</option>
                    {Object.keys(paceData.metadata.genders).map((g) => (
                        <option key={g} value={g}>{paceData.metadata.genders[g]}</option>
                    ))}
                </select>
            </div>
            <div className="bangers-regular text-xl flex flex-row">
                <p>Age: </p>
                <input
                    type="text"
                    className="border-b border-gray-700"
                    value={age ?? ""}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : 0)}
                />
            </div>
            <div className="text-3xl bangers-regular">
                {!paceKm && <p className="text-gray-500 bangers-regular">Enter time to calculate your pace and VDOT</p>}
                {paceKm && <p className="bangers-regular">{paceKm}</p>}
                {paceMile && <p className="bangers-regular">{paceMile}</p>}
                {paceClassification && <p className="bangers-regular">Your pace is considered {paceClassification}</p>}
                {paceKm && <p className="bangers-regular">Your VDOT is {vdot.toFixed(1)} ({vdotTier})</p>}
            </div>
        </>
    );
}