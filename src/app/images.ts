import BackgroundImage from '../../public/images/배경.png';
import MainTitle from '../../public/images/메인제목.png';
import SubTitleBg from '../../public/images/글자배경.png';
import SubTitleBg2 from '../../public/images/글자배경2.png';
import Speaker1 from '../../public/images/강사1.png';
import Speaker2 from '../../public/images/강사2.png';
import Speaker3 from '../../public/images/강사3.png';
import GumiMap from '../../public/images/구미지도.png';
import SeoulMap from '../../public/images/서울지도.png';
import LogoText from '../../public/images/글자로고.png';
import ScheduleImage from '../../public/images/일정표.png';
import LocationMark from '../../public/images/위치마크.png';
import ExampleImage from '../../public/images/예시.png';
import Logo from '../../public/images/로고.png';
import Logo2 from '../../public/images/주최로고.png';

const images = {
  background: BackgroundImage,
  mainTitle: MainTitle,
  subTitleBg: SubTitleBg,
  subTitleBg2: SubTitleBg2,
  speakers: [
    { image: Speaker1, name: '김정원', title: '목사', role: '안디옥교회 담임', description: '(사) 글로벌 플랜터스 대표' },
    { image: Speaker2, name: '정우성', title: '이사', role: '한국창조과학회 이사', description: '삼성전자 수석연구원' },
    { image: Speaker3, name: '이지은', title: '교수', role: '한국교원대학교', description: '교육학 박사' }
  ],
  gmap: GumiMap,
  smap: SeoulMap,
  logoText: LogoText,
  schedule: ScheduleImage,
  locationMark: LocationMark,
  example: ExampleImage,
  logo: Logo,
  logo2: Logo2
};

export default images;
