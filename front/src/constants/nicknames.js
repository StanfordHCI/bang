import SquirrelSrc from '../img/Squirrel.svg';
import RhinoSrc from '../img/Rhino.svg';
import HorseSrc from '../img/Horse.svg';
import PigSrc from '../img/Pig.svg';
import PandaSrc from '../img/Panda.svg';
import MonkeySrc from '../img/Monkey.svg';
import LionSrc from '../img/Lion.svg';
import OrangutanSrc from '../img/Orangutan.svg';
import GorillaSrc from '../img/Gorilla.svg';
import HippoSrc from '../img/Hippo.svg';
import RabbitSrc from '../img/Rabbit.svg';
import WolfSrc from '../img/Wolf.svg';
import GoatSrc from '../img/Goat.svg';
import GiraffeSrc from '../img/Giraffe.svg';
import DonkeySrc from '../img/Donkey.svg';
import CowSrc from '../img/Cow.svg';
import BearSrc from '../img/Bear.svg';
import BisonSrc from '../img/Bison.svg';

import MaleSrc from '../img/male.png'
import FemaleSrc from '../img/female.png'
import UndefinedGenderSrc from '../img/undefinedGender.png'

export const animalMap = new Map();
animalMap.set("Squirrel", SquirrelSrc);
animalMap.set("Rhino", RhinoSrc);
animalMap.set("Horse", HorseSrc);
animalMap.set("Pig", PigSrc);
animalMap.set("Panda", PandaSrc);
animalMap.set("Monkey", MonkeySrc);
animalMap.set("Lion", LionSrc);
animalMap.set("Orangutan", OrangutanSrc);
animalMap.set("Gorilla", GorillaSrc);
animalMap.set("Hippo", HippoSrc);
animalMap.set("Rabbit", RabbitSrc);
animalMap.set("Wolf", WolfSrc);
animalMap.set("Goat", GoatSrc);
animalMap.set("Giraffe", GiraffeSrc);
animalMap.set("Donkey", DonkeySrc);
animalMap.set("Cow", CowSrc);
animalMap.set("Bear", BearSrc);
animalMap.set("Bison", BisonSrc);

export const adjMap = new Map();
adjMap.set("new", "#A7C5BD");
adjMap.set("small", "#E5DDCB");
adjMap.set("young", "#EB7B59");
adjMap.set("little", "#CF4647");
adjMap.set("likely", "#A0B046");
adjMap.set("nice", "#69D2E7");
adjMap.set("cultured", "#601848");
adjMap.set("snappy", "#F6E7F7");
adjMap.set("spry", "#D1D0D7");
adjMap.set("conventional", "#FC284F");

export const genderMap = new Map();
genderMap.set("male", MaleSrc);
genderMap.set("female", FemaleSrc);
genderMap.set("prefer not to say", UndefinedGenderSrc);
