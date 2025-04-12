// ----------------------------------------
// パーティクル波アニメーション
// ----------------------------------------

// ランダムな正規分布の値を生成するライブラリ
import randomNormal from 'random-normal';
import { Scene, Renderer, Camera, Object3D } from 'three';

// Three.js + OrbitControls（今は未使用）
const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);

// 粒子の基本設定（数、サイズ、動きの速度）
const NUM_PARTICLES = 3000;       // 全粒子数
const PARTICLE_SIZE = 0.3;        // 粒子の直径（球体のサイズ）
const SPEED = 20000;              // アニメーション1周の時間（ms）

// 全粒子で共通のジオメトリ（球）を作成
const sphereGeometry = new THREE.SphereGeometry(PARTICLE_SIZE, 32, 32);

// 粒子オブジェクトの型定義（パラメータを格納）
interface Particle {
  duration: number,       // アニメーション1周にかかる時間
  amplitude: number,      // 波の振れ幅（縦の動き）
  offsetY: number,        // 波の中心の上下のズレ
  arc: number,            // 波の角度（カーブの個体差）
  startTime: number,      // 開始時刻（アニメーションの進行をずらす）
  z: number,              // Z軸方向のランダムな奥行き感
  geometry: Object3D,     // Three.jsの描画オブジェクト（球体）
};

let particles: Particle[] = [];

// 指定範囲でランダムな数値を生成する関数
function rand(low: number, high: number) {
  return Math.random() * (high - low) + low;
}

// 個別の粒子を生成して、Three.jsシーンに追加
function createParticle(scene: Scene) {
  const color = new THREE.Color(1, 1, 1); // 白色の粒子
  const scale = randomNormal({ mean: 0.7, dev: 2 / 5 }); // スケールをランダムにばらけさせる

  const material = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.8,          // 粒子の透明度
    transparent: true,     // 透明設定を有効に
  });

  const circle = new THREE.Mesh(sphereGeometry, material);
  circle.scale.set(scale, scale, scale); // スケール反映（x, y, z）
  scene.add(circle); // シーンに追加

  return {
    duration: randomNormal({ mean: SPEED, dev: SPEED / 10 }), // アニメ1周の時間（ランダム）
    amplitude: randomNormal({ mean: 25, dev: 1 }),             // 波の縦振幅
    offsetY: randomNormal({ mean: 0, dev: 12 }),               // 波の中心位置（上下方向）
    arc: randomNormal({ mean: Math.PI * 2, dev: 0.1 }),        // 波の角度（パターン個性）
    startTime: performance.now() - rand(0, SPEED),             // ランダムに開始時間をずらす
    z: randomNormal({ mean: 0, dev: 8 }),                      // Z軸方向（奥行き感）
    geometry: circle,
  };
}

// 粒子1つの位置を現在時刻に基づいて更新する処理
function moveParticle(particle: Particle, time: number) {
  const progress = 1 - ((time - particle.startTime) % particle.duration) / particle.duration; // 0→1のアニメ進行度
  const x = progress * 300 - 150; // 右→左に流れるようにx座標を設定（線形）

  // x位置に応じて中心からの距離で波のスケールを決定
  const distanceFromCenter = Math.abs(x); // 中心からの距離
  const maxDistance = 90;                 // スケーリングが効く最大距離
  const shrinkFactor = 1 - Math.pow(distanceFromCenter / maxDistance, 2); // 中心付近は太く、端にいくほど細く

  // 縦の振幅や中心のずれをスケールに応じて調整
  const amplitude = particle.amplitude * shrinkFactor;
  const offsetY = particle.offsetY * shrinkFactor;

  const y = -Math.sin(progress * particle.arc) * amplitude + offsetY; // 波の上下動を適用
  particle.geometry.position.set(x, y, particle.z); // 位置更新（X, Y, Z）
}

// 描画ループ：各フレームで粒子の位置更新＋描画
function draw(time: number, scene: Scene, camera: Camera, renderer: Renderer) {
  for (let i = 0; i < particles.length; i++) {
    moveParticle(particles[i], time); // 粒子を動かす
  }
  renderer.render(scene, camera); // 描画処理
  requestAnimationFrame((time) => draw(time, scene, camera, renderer)); // 次フレーム予約
}

// ウィンドウ幅に応じてカメラのZ位置（奥行き）を調整する関数
function getZFromWidth(width: number): number {
  const baseWidth = 1440;      // デスクトップ基準幅
  const baseZ = 125;           // この時のZ位置
  const scale = width / baseWidth;
  return baseZ / scale;        // ウィンドウ幅に応じたZ位置
}

// Three.jsのCanvas（Scene, Camera, Renderer）を初期化
function initializeCanvas(): [Scene, Camera, Renderer] {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 1000 // 視野角60, 近/遠距離設定
  );

  camera.position.set(0, 1, getZFromWidth(window.innerWidth)); // Zは画面幅に応じて可変
  camera.lookAt(0, 0, 0); // 常に中心を見つめる

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight); // 画面全体に広げる
  renderer.setPixelRatio(window.devicePixelRatio);         // 高DPI対応
  document.body.appendChild(renderer.domElement);          // DOMに追加

  // リサイズ対応：ウィンドウ変更時に調整
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; // アスペクト比再計算
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = getZFromWidth(window.innerWidth);    // 再計算されたZ距離を適用
  });

  return [scene, camera, renderer];
}

// アニメーションの開始処理
function startAnimation() {
  const [scene, camera, renderer] = initializeCanvas();

  // 粒子を生成して配列に追加
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(createParticle(scene));
  }

  // 描画ループ開始
  requestAnimationFrame((time) => draw(time, scene, camera, renderer));
}

// ページ読み込み完了後にアニメーションスタート
(function () {
  if (document.readyState !== 'loading') {
    startAnimation();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      startAnimation();
    });
  }
})();
