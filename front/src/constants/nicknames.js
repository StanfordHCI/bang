import HorseSrc from "../img/Horse.svg";
import GiraffeSrc from "../img/Giraffe.svg";
import BearSrc from "../img/Bear.svg";
import MonkeySrc from "../img/Monkey.svg";
import OtterSrc from "../img/Otter.svg";
import CamelSrc from "../img/Camel.svg";
import ElephantSrc from "../img/Elephant.svg";
import DolphinSrc from "../img/Dolphin.svg";
import ZebraSrc from "../img/Zebra.svg";
import HippoSrc from "../img/Hippo.svg";
import GorillaSrc from "../img/Gorilla.svg";
import BisonSrc from "../img/Bison.svg";

import MaleSrc from "../img/male.png";
import FemaleSrc from "../img/female.png";
import UndefinedGenderSrc from "../img/undefinedGender.png";

export const animalMap = new Map();
animalMap.set("Camel", CamelSrc);
animalMap.set("Dolphin", DolphinSrc);
animalMap.set("Elephant", ElephantSrc);
animalMap.set("Monkey", MonkeySrc);
animalMap.set("Otter", OtterSrc);
animalMap.set("Zebra", ZebraSrc);
animalMap.set("Horse", HorseSrc);
animalMap.set("Giraffe", GiraffeSrc);
animalMap.set("Bear", BearSrc);
animalMap.set("Gorilla", GorillaSrc);
animalMap.set("Hippo", HippoSrc);
animalMap.set("Bison", BisonSrc);

export const adjMap = new Map();
adjMap.set("bright", "#A7C5BD");
adjMap.set("curious", "#E5DDCB");
adjMap.set("delighted", "#EB7B59");
adjMap.set("eager", "#CF4647");
adjMap.set("excited", "#A0B046");
adjMap.set("inquisitive", "#69D2E7");
adjMap.set("light", "#601848");
adjMap.set("lively", "#cf9dd3");
adjMap.set("novel", "#6b56e4");
adjMap.set("open", "#cc9a24");
adjMap.set("fulfilled", "#26a036");
adjMap.set("inspired", "#2628a0");

export const genderMap = new Map();
genderMap.set("male", MaleSrc);
genderMap.set("female", FemaleSrc);
genderMap.set("prefer not to say", UndefinedGenderSrc);
